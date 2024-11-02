'use client';

import { useState } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { FileObject } from '@/types';
import { DochiveLogo } from './dochive-logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface FileSidebarProps {
  files: FileObject[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFileUpload: () => void;
  isUploading: boolean;
}

export function FileSidebar({
  files,
  selectedFileId,
  onFileSelect,
  onFileDelete,
  onFileRename,
  onFileUpload,
  isUploading,
}: FileSidebarProps) {
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileObject | null>(null);
  const [newName, setNewName] = useState('');

  const handleRenameClick = (file: FileObject) => {
    setFileToRename(file);
    setNewName(file.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (fileToRename && newName.trim()) {
      onFileRename(fileToRename.id, newName.trim());
    }
    setRenameDialogOpen(false);
    setFileToRename(null);
    setNewName('');
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-3 sm:p-4 border-b">
          <div className="flex items-center gap-3">
            <DochiveLogo className="w-6 h-6 sm:w-8 sm:h-8" />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              <span className="hidden sm:inline">Dochive AI</span>
              <span className="sm:hidden">Dochive</span>
            </h1>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-1 sm:p-2">
          <SidebarMenu>
            {files.map(file => (
              <SidebarMenuItem key={file.id}>
                <SidebarMenuButton
                  onClick={() => onFileSelect(file.id)}
                  isActive={selectedFileId === file.id}
                  className="group min-h-[44px] sm:min-h-[40px]"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate flex-1 text-sm sm:text-base">{file.name}</span>
                </SidebarMenuButton>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRenameClick(file)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onFileDelete(file.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 sm:p-4 border-t">
          <Button
            className="w-full h-10 sm:h-9 text-sm sm:text-base"
            onClick={onFileUpload}
            disabled={isUploading}
          >
            <UploadCloud className="mr-2 h-4 w-4 sm:h-4 sm:w-4" />
            {isUploading ? 'Processing...' : 'Upload Files'}
          </Button>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={isRenameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="col-span-3"
                onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
