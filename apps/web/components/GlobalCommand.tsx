"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator 
} from "@/components/ui/command";
import { Search, FileText, Clock, TrendingUp, BookOpen, Coins, Heart, Shield } from "lucide-react";

export default function GlobalCommand() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search help articles or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Popular searches">
          <CommandItem onSelect={() => runCommand(() => router.push("/search?q=view+payslips"))}>
            <FileText className="mr-2 h-4 w-4" />
            How to view payslips
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/search?q=submit+expense"))}>
            <FileText className="mr-2 h-4 w-4" />
            Submit an expense report
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/search?q=add+employee"))}>
            <FileText className="mr-2 h-4 w-4" />
            Add a new employee
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/search?q=background+checks"))}>
            <FileText className="mr-2 h-4 w-4" />
            Set up background checks
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Categories">
          <CommandItem onSelect={() => runCommand(() => router.push("/search?category=Library"))}>
            <BookOpen className="mr-2 h-4 w-4" />
            Library
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/search?category=Token+Payroll"))}>
            <Coins className="mr-2 h-4 w-4" />
            Token Payroll
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/search?category=Benefits"))}>
            <Heart className="mr-2 h-4 w-4" />
            Benefits
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/search?category=Policy"))}>
            <Shield className="mr-2 h-4 w-4" />
            Policy
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => runCommand(() => router.push("/contact"))}>
            <Search className="mr-2 h-4 w-4" />
            Contact support
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/search"))}>
            <Search className="mr-2 h-4 w-4" />
            Advanced search
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
