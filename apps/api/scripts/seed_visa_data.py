"""
Script to seed the visa knowledge base with the provided Toku AI Visa Support document.
Run: python scripts/seed_visa_data.py
"""

import asyncio
import asyncpg
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.visa_indexer import VisaIndexerService
from services.embeddings import EmbeddingsService
from services.chunking import ChunkingService
from core.settings import settings

# The full visa document content (from your provided doc)
VISA_KNOWLEDGE_BASE = """
# Toku AI Visa Support Knowledge Base

## Purpose
This document powers Toku's AI-driven self-service Visa Chatbot, allowing contributors and clients to assess eligibility, estimate timelines, and receive step-by-step guidance on visa processes worldwide.

## Section 1: Global Overview
Toku provides global immigration support for:
- Work visas, residence permits, and employment passes
- Employer of Record (EOR) compliance for global hiring
- AI-based eligibility assessments using standardized criteria

⚠️ **Disclaimer**: Visa rules and fees are subject to frequent change. Always confirm with Toku's immigration team or local legal counsel before acting on chatbot guidance.

## Section 2: Eligibility Criteria Matrix

| Visa Type | Education Requirement | Job Offer Required | Special Criteria |
|-----------|----------------------|-------------------|-----------------|
| H-1B (USA) | Bachelor's or equivalent in specialty occupation | ✅ Yes | LCA certification, specialty role |
| F-1 CPT/OPT (USA) | Active full-time student | ❌ No (school approval only) | Work must relate to curriculum |
| O-1 (USA) | No specific degree | ✅ Yes | Extraordinary ability – meet 3 of 8 USCIS criteria |
| UK Skilled Worker | RQF Level 3 or higher (A-level equivalent) | ✅ Yes | English proficiency test |
| Canada LMIA | Varies by occupation | ✅ Yes | LMIA approval unless exempt |
| Germany Blue Card | Recognized university degree | ✅ Yes | Salary threshold €41,041.80–€45,300 |
| Singapore EP | Degree or equivalent | ✅ Yes | Minimum monthly salary S$5,000+ |
| UAE Work Visa | Degree for skilled roles | ✅ Yes | Clean criminal record, medical test |

## Section 3: Country-Specific Visa Guides

### United States

#### 3.1 H-1B Visa – Specialty Occupations
**Purpose:** To hire foreign nationals in specialized roles such as engineering, healthcare, IT, and finance.

**Eligibility Requirements:**
- U.S. employer job offer for a specialty occupation
- Bachelor's degree or equivalent experience (3:1 rule for work-to-education)
- Employer must file a Labor Condition Application (LCA) with the Department of Labor
- Role must require specialized knowledge

**Recent Change (2025): $100,000 Annual Fee**
Effective January 2025, a mandatory $100,000 annual fee applies to each new H-1B application.
- Fee paid by employer, not employee
- Weighted lottery prioritizes higher-paying roles:
  - Highest wage tier → 4 entries
  - Second-highest wage tier → 3 entries
  - And so forth
- Objective: Incentivize high-skilled, high-paid positions and reduce abuse of the system

**Timeline:**
| Step | Duration |
|------|----------|
| LCA Certification | 7–10 days |
| Petition Prep & Docs | 2–4 weeks |
| USCIS Regular Processing | 3–6 months |
| USCIS Premium Processing | 15 calendar days |

**Government Fees:**
- Base I-129 Filing Fee: $460
- Fraud Prevention Fee: $500
- ACWIA Fee: $750 (<25 employees) or $1,500 (≥25 employees)
- Premium Processing Fee: $2,805
- NEW Fee: $100,000 annually (2025 reform)

**Employer Compliance Obligations:**
- Maintain a Public Access File (PAF)
- Confirm salary meets prevailing wage
- Track visa expiry to avoid unlawful presence

#### 3.2 F-1 Student Visa: CPT & OPT
**Curricular Practical Training (CPT):**
- Work must be integral to academic program
- Authorized by Designated School Official (DSO)

**Optional Practical Training (OPT):**
- Up to 12 months post-graduation
- STEM Extension: Additional 24 months for eligible fields
- Work must directly relate to field of study

**Fees:**
- USCIS I-765 Filing Fee: $470 (OPT only)

#### 3.3 O-1 Visa – Extraordinary Ability
**Ideal For:** Founders, researchers, and top-tier talent.

**Extraordinary Ability Criteria (must meet 3 of 8):**
1. National or international awards
2. Membership in selective professional associations
3. Major media coverage of achievements
4. Participation as a judge of others
5. Original contributions of major significance
6. Published scholarly articles
7. Employment in critical roles for distinguished organizations
8. High salary relative to peers

**Timeline:**
- Evidence Gathering: 3–4 weeks
- USCIS Processing: 2–4 months
- Premium Processing: 15 business days

**Government Fees:**
- I-129 Fee: $1,055
- Fraud Fee: $500
- Premium Processing: $2,805

### Canada – Work Permits

#### LMIA-Based Pathway
- Employer must prove no qualified Canadians are available
- Advertising required for at least 30 days
- LMIA approval precedes work permit issuance

**Government Fees:**
- LMIA Fee: CAD $1,000
- Work Permit Fee: CAD $155
- Biometrics Fee: CAD $85

**Processing Time:** 3–6 months

#### LMIA-Exempt Categories:
- Intra-Company Transfer (ICT)
- Trade agreement roles (e.g., CUSMA)

### Germany – EU Blue Card

**Eligibility:**
- Recognized university degree
- Salary thresholds:
  - €45,300 (general)
  - €41,041.80 (shortage professions like IT)

**Timeline:** 2–4 months total

**Government Fees:**
- Entry Visa: €75–€100
- Residence Permit: €100–€110

### Singapore – Employment Pass (EP)

**Eligibility:**
- Degree or equivalent
- Monthly salary: S$5,000+
- Role must be managerial or specialized

**Government Fees:**
- Application: S$105
- Issuance: S$225

### UAE – Work Visa Process

**Eligibility:**
- Valid job offer from UAE-licensed entity
- Degree attestation required for skilled roles
- Clean criminal record
- Medical fitness clearance

#### Step-by-Step UAE Process:
| Step | Details |
|------|---------|
| 1. Degree Attestation | Home country + UAE MoFA attestation, Arabic translation |
| 2. Entry Permit | Some nationalities need permits; others can enter visa-free |
| 3. Travel Preparation | Collect documents: passport, photo, attested degree, signed contract |
| 4. Medical & Biometrics | Health check, fingerprinting, insurance enrollment |
| 5. Visa & Emirates ID | Digital visa issued; physical Emirates ID delivered |

**Optional Services:**
- Expedited biometrics: AED 1,200
- Concierge services: AED 3,000

## Contact
For complex cases: legal@toku.com
"""

async def seed_visa_knowledge():
    """Seed the visa knowledge base"""
    
    # Connect to database
    db_pool = await asyncpg.create_pool(settings.database_url)
    
    # Initialize services
    embeddings_service = EmbeddingsService()
    chunking_service = ChunkingService()
    indexer = VisaIndexerService(db_pool, embeddings_service, chunking_service)
    
    # Index the main document
    print("🚀 Seeding visa knowledge base...")
    
    try:
        article_id = await indexer.index_document(
            title="Toku AI Visa Support - Complete Knowledge Base",
            content_md=VISA_KNOWLEDGE_BASE,
            country_code=None,  # Global
            visa_type=None,  # Multiple
            category="overview"
        )
        
        print(f"✅ Successfully seeded visa knowledge base (Article ID: {article_id})")
        
        # Now let's add some specific country/visa type documents
        
        # H-1B specific document
        h1b_content = """
# H-1B Visa Complete Guide (2025)

## Overview
The H-1B visa is a non-immigrant visa that allows U.S. companies to employ foreign workers in specialty occupations that require theoretical or technical expertise.

## 2025 Reform: $100,000 Annual Fee
Starting January 2025, a significant reform has been implemented:
- **Mandatory annual fee:** $100,000 per H-1B application
- **Paid by:** Employer (not the employee)
- **Purpose:** Reduce program abuse and prioritize high-skilled, high-wage positions

## Eligibility Requirements
1. **Job offer** from a U.S. employer for a specialty occupation
2. **Bachelor's degree** or higher (or equivalent) in the specific specialty
3. **Labor Condition Application (LCA)** must be certified by DOL
4. **Prevailing wage** must be met

## Timeline
- LCA Certification: 7-10 days
- Petition Preparation: 2-4 weeks
- Regular Processing: 3-6 months
- Premium Processing: 15 calendar days

## Total Costs (2025)
- Base Filing Fee: $460
- Fraud Prevention Fee: $500
- ACWIA Fee: $750-$1,500
- Premium Processing: $2,805 (optional)
- **NEW Annual Fee: $100,000**
- Total: ~$102,515 - $104,765

## Lottery System
The H-1B lottery now uses a weighted system:
- Highest wage tier: 4 entries
- Second tier: 3 entries
- Third tier: 2 entries
- Fourth tier: 1 entry
"""
        
        h1b_id = await indexer.index_document(
            title="H-1B Visa Detailed Guide 2025",
            content_md=h1b_content,
            country_code="US",
            visa_type="H1B",
            category="process"
        )
        print(f"✅ Added H-1B specific guide (ID: {h1b_id})")
        
        # UK Skilled Worker visa document
        uk_content = """
# UK Skilled Worker Visa Guide

## Overview
The UK Skilled Worker visa allows you to come to or stay in the UK to do an eligible job with an approved employer.

## Eligibility Requirements
1. **Job offer** from UK employer with sponsor license
2. **Certificate of Sponsorship** from your employer
3. **English language** requirement (CEFR Level B1)
4. **Salary threshold:** Usually £26,200 or the 'going rate' for the job
5. **Maintenance funds:** £1,270 in bank account

## Processing Time
- Outside UK: 3 weeks
- Inside UK: 8 weeks
- Priority service: 5 working days

## Costs
- Application fee: £719-£1,500 (depending on duration)
- Healthcare surcharge: £1,035 per year
- Biometric fee: £19.20
- Priority service: £500-£800

## Duration
- Up to 5 years
- Can lead to settlement (ILR) after 5 years
"""
        
        uk_id = await indexer.index_document(
            title="UK Skilled Worker Visa Complete Guide",
            content_md=uk_content,
            country_code="UK",
            visa_type="Skilled Worker",
            category="eligibility"
        )
        print(f"✅ Added UK Skilled Worker guide (ID: {uk_id})")
        
    except Exception as e:
        print(f"❌ Error seeding visa knowledge base: {e}")
    finally:
        await db_pool.close()

if __name__ == "__main__":
    asyncio.run(seed_visa_knowledge())
