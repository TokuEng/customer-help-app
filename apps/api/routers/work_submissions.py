from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid
import asyncpg
import json

router = APIRouter()

# Request Models
class WorkSubmissionRequest(BaseModel):
    request_type: str
    title: str
    description: str
    priority: Optional[str] = "medium"  # low, medium, high, urgent
    submitter_name: str
    submitter_email: EmailStr
    submitter_role: Optional[str] = None
    department: Optional[str] = None
    tags: Optional[List[str]] = []
    attachments: Optional[List[dict]] = []

class WorkSubmissionResponse(BaseModel):
    id: str
    request_type: str
    title: str
    description: str
    priority: str
    status: str
    submitter_name: str
    submitter_email: str
    submitter_role: Optional[str]
    department: Optional[str]
    tags: List[str]
    attachments: Optional[List[dict]]
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

class WorkSubmissionCommentRequest(BaseModel):
    author_name: str
    author_email: EmailStr
    comment: str
    is_internal: bool = False

class WorkSubmissionUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    internal_notes: Optional[str] = None
    resolution_notes: Optional[str] = None

@router.post("/work-submissions", response_model=WorkSubmissionResponse)
async def create_work_submission(request: Request, submission: WorkSubmissionRequest):
    """Create a new work submission request"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Received work submission request: {submission.dict()}")
    
    try:
        db_pool = request.app.state.db_pool()
    except Exception as e:
        logger.error(f"Failed to get db_pool: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Database pool access error: {type(e).__name__}"
        )
    
    # Check if database pool is available
    if db_pool is None:
        logger.error("Database pool is None")
        raise HTTPException(
            status_code=500, 
            detail="Database connection not available. Please check server configuration."
        )
    
    try:
        # Validate and normalize priority
        valid_priorities = ["low", "medium", "high", "urgent"]
        # Normalize priority to lowercase
        normalized_priority = submission.priority.lower() if submission.priority else "medium"
        
        if normalized_priority not in valid_priorities:
            logger.warning(f"Invalid priority: {submission.priority} (normalized: {normalized_priority})")
            raise HTTPException(status_code=400, detail=f"Invalid priority. Must be one of: {', '.join(valid_priorities)}")
        
        # Update the submission object with normalized priority
        submission.priority = normalized_priority
        
        logger.info("Acquiring database connection...")
        async with db_pool.acquire() as conn:
            logger.info("Database connection acquired, preparing insert...")
            
            # Log the actual values being inserted
            logger.info(f"Insert values: type={submission.request_type}, title={submission.title}, "
                       f"priority={submission.priority}, email={submission.submitter_email}")
            
            # Insert the work submission
            result = await conn.fetchrow(
                """
                INSERT INTO work_submissions (
                    request_type, title, description, priority, 
                    submitter_name, submitter_email, submitter_role, department,
                    tags, attachments
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
                """,
                submission.request_type,
                submission.title,
                submission.description,
                submission.priority,
                submission.submitter_name,
                submission.submitter_email,
                submission.submitter_role,
                submission.department,
                submission.tags or [],  # Ensure tags is always a list
                json.dumps(submission.attachments or [])  # Convert to JSON string for jsonb column
            )
            
            logger.info(f"Insert successful, record ID: {result['id']}")
            
            # Parse attachments back from JSON string if needed
            attachments = result['attachments']
            if isinstance(attachments, str):
                attachments = json.loads(attachments)
            elif attachments is None:
                attachments = []
            
            return WorkSubmissionResponse(
                id=str(result['id']),
                request_type=result['request_type'],
                title=result['title'],
                description=result['description'],
                priority=result['priority'],
                status=result['status'],
                submitter_name=result['submitter_name'],
                submitter_email=result['submitter_email'],
                submitter_role=result['submitter_role'],
                department=result['department'],
                tags=result['tags'] or [],
                attachments=attachments,
                assigned_to=result['assigned_to'],
                created_at=result['created_at'],
                updated_at=result['updated_at'],
                completed_at=result['completed_at']
            )
            
    except asyncpg.PostgresError as e:
        # Database-specific errors
        logger.error(f"PostgreSQL error: {e.__class__.__name__}: {str(e)}")
        logger.error(f"Error details: {repr(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Database error: {e.__class__.__name__}: {str(e)}"
        )
    except Exception as e:
        # General errors
        logger.error(f"Unexpected error: {e.__class__.__name__}: {str(e)}")
        logger.error(f"Error details: {repr(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {e.__class__.__name__}: {str(e)}"
        )

@router.get("/work-submissions", response_model=List[WorkSubmissionResponse])
async def list_work_submissions(
    request: Request,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    submitter_email: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List work submissions with optional filters"""
    db_pool = request.app.state.db_pool()
    
    try:
        async with db_pool.acquire() as conn:
            # Build query with filters
            query = "SELECT * FROM work_submissions WHERE 1=1"
            params = []
            param_count = 0
            
            if status:
                param_count += 1
                query += f" AND status = ${param_count}"
                params.append(status)
            
            if priority:
                param_count += 1
                query += f" AND priority = ${param_count}"
                params.append(priority)
            
            if submitter_email:
                param_count += 1
                query += f" AND submitter_email = ${param_count}"
                params.append(submitter_email)
            
            query += " ORDER BY created_at DESC"
            
            param_count += 1
            query += f" LIMIT ${param_count}"
            params.append(limit)
            
            param_count += 1
            query += f" OFFSET ${param_count}"
            params.append(offset)
            
            results = await conn.fetch(query, *params)
            
            submissions = []
            for row in results:
                # Parse attachments if needed
                attachments = row['attachments']
                if isinstance(attachments, str):
                    attachments = json.loads(attachments)
                elif attachments is None:
                    attachments = []
                
                submissions.append(WorkSubmissionResponse(
                    id=str(row['id']),
                    request_type=row['request_type'],
                    title=row['title'],
                    description=row['description'],
                    priority=row['priority'],
                    status=row['status'],
                    submitter_name=row['submitter_name'],
                    submitter_email=row['submitter_email'],
                    submitter_role=row['submitter_role'],
                    department=row['department'],
                    tags=row['tags'] or [],
                    attachments=attachments,
                    assigned_to=row['assigned_to'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                    completed_at=row['completed_at']
                ))
            
            return submissions
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/work-submissions/{submission_id}", response_model=WorkSubmissionResponse)
async def get_work_submission(request: Request, submission_id: str):
    """Get a specific work submission by ID"""
    db_pool = request.app.state.db_pool()
    
    try:
        # Validate UUID
        submission_uuid = uuid.UUID(submission_id)
        
        async with db_pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT * FROM work_submissions WHERE id = $1",
                submission_uuid
            )
            
            if not result:
                raise HTTPException(status_code=404, detail="Work submission not found")
            
            # Parse attachments if needed
            attachments = result['attachments']
            if isinstance(attachments, str):
                attachments = json.loads(attachments)
            elif attachments is None:
                attachments = []
            
            return WorkSubmissionResponse(
                id=str(result['id']),
                request_type=result['request_type'],
                title=result['title'],
                description=result['description'],
                priority=result['priority'],
                status=result['status'],
                submitter_name=result['submitter_name'],
                submitter_email=result['submitter_email'],
                submitter_role=result['submitter_role'],
                department=result['department'],
                tags=result['tags'] or [],
                attachments=attachments,
                assigned_to=result['assigned_to'],
                created_at=result['created_at'],
                updated_at=result['updated_at'],
                completed_at=result['completed_at']
            )
            
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid submission ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/work-submissions/{submission_id}", response_model=WorkSubmissionResponse)
async def update_work_submission(
    request: Request,
    submission_id: str,
    update: WorkSubmissionUpdateRequest
):
    """Update a work submission"""
    db_pool = request.app.state.db_pool()
    
    try:
        # Validate UUID
        submission_uuid = uuid.UUID(submission_id)
        
        async with db_pool.acquire() as conn:
            # Check if submission exists
            exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM work_submissions WHERE id = $1)",
                submission_uuid
            )
            
            if not exists:
                raise HTTPException(status_code=404, detail="Work submission not found")
            
            # Build update query dynamically
            update_fields = []
            params = [submission_uuid]
            param_count = 1
            
            if update.status is not None:
                param_count += 1
                update_fields.append(f"status = ${param_count}")
                params.append(update.status)
                
                # If status is completed, set completed_at
                if update.status == "completed":
                    update_fields.append("completed_at = now()")
            
            if update.priority is not None:
                param_count += 1
                update_fields.append(f"priority = ${param_count}")
                params.append(update.priority)
            
            if update.assigned_to is not None:
                param_count += 1
                update_fields.append(f"assigned_to = ${param_count}")
                params.append(update.assigned_to)
            
            if update.internal_notes is not None:
                param_count += 1
                update_fields.append(f"internal_notes = ${param_count}")
                params.append(update.internal_notes)
            
            if update.resolution_notes is not None:
                param_count += 1
                update_fields.append(f"resolution_notes = ${param_count}")
                params.append(update.resolution_notes)
            
            # Always update updated_at
            update_fields.append("updated_at = now()")
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            query = f"""
                UPDATE work_submissions 
                SET {', '.join(update_fields)}
                WHERE id = $1
                RETURNING *
            """
            
            result = await conn.fetchrow(query, *params)
            
            # Parse attachments if needed
            attachments = result['attachments']
            if isinstance(attachments, str):
                attachments = json.loads(attachments)
            elif attachments is None:
                attachments = []
            
            return WorkSubmissionResponse(
                id=str(result['id']),
                request_type=result['request_type'],
                title=result['title'],
                description=result['description'],
                priority=result['priority'],
                status=result['status'],
                submitter_name=result['submitter_name'],
                submitter_email=result['submitter_email'],
                submitter_role=result['submitter_role'],
                department=result['department'],
                tags=result['tags'] or [],
                attachments=attachments,
                assigned_to=result['assigned_to'],
                created_at=result['created_at'],
                updated_at=result['updated_at'],
                completed_at=result['completed_at']
            )
            
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid submission ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/work-submissions/{submission_id}/comments")
async def add_comment(
    request: Request,
    submission_id: str,
    comment: WorkSubmissionCommentRequest
):
    """Add a comment to a work submission"""
    db_pool = request.app.state.db_pool()
    
    try:
        # Validate UUID
        submission_uuid = uuid.UUID(submission_id)
        
        async with db_pool.acquire() as conn:
            # Check if submission exists
            exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM work_submissions WHERE id = $1)",
                submission_uuid
            )
            
            if not exists:
                raise HTTPException(status_code=404, detail="Work submission not found")
            
            # Insert comment
            await conn.execute(
                """
                INSERT INTO work_submission_comments (
                    submission_id, author_name, author_email, comment, is_internal
                )
                VALUES ($1, $2, $3, $4, $5)
                """,
                submission_uuid,
                comment.author_name,
                comment.author_email,
                comment.comment,
                comment.is_internal
            )
            
            # Update the submission's updated_at timestamp
            await conn.execute(
                "UPDATE work_submissions SET updated_at = now() WHERE id = $1",
                submission_uuid
            )
            
            return {"success": True, "message": "Comment added successfully"}
            
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid submission ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

