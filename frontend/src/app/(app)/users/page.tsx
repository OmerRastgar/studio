
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserProfile, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, PlusCircle, Search, Edit, Trash2, KeyRound } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/components/auth/kratos-auth-provider';

const TimeAgo = ({ date }: { date: string | undefined }) => {
  const [timeAgo, setTimeAgo] = React.useState('');

  React.useEffect(() => {
    if (date) {
      setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true }));
    } else {
      setTimeAgo('Never');
    }
  }, [date]);

  return <>{timeAgo}</>;
};

export default function UsersPage() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  /* ... (imports remain) ... */
  // Add managerId to state definitions
  const [newUser, setNewUser] = React.useState<{
    name: string;
    email: string;
    role: User['role'];
    managerId?: string; // Add managerId
    linkedCustomerId?: string;
  }>({ name: '', email: '', role: 'customer', managerId: 'none', linkedCustomerId: 'none' });
  const [isCreating, setIsCreating] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const { toast } = useToast();

  const userRoles: User['role'][] = React.useMemo(() => {
    const allRoles: User['role'][] = ['admin', 'auditor', 'customer', 'manager', 'compliance'];
    if (currentUser?.role === 'manager') {
      return ['auditor', 'customer', 'compliance'];
    }
    return allRoles;
  }, [currentUser]);

  // Ensure default role is valid when dialog opens or roles change
  React.useEffect(() => {
    if (currentUser?.role === 'manager' && ['admin', 'manager'].includes(newUser.role)) {
      setNewUser(prev => ({ ...prev, role: 'customer' }));
    }
  }, [currentUser?.role, newUser.role]);

  // Memoize managers list for dropdown
  const managers = React.useMemo(() => users.filter(u => u.role === 'manager'), [users]);

  // Fetch users from API
  const fetchUsers = React.useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch users',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, token]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      const term = searchTerm.toLowerCase();
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      const searchMatch = user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
      return roleMatch && searchMatch;
    });
  }, [users, searchTerm, roleFilter]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('');

  const handleCreateUser = async () => {
    // Basic validation
    if (!newUser.name || !newUser.email) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a name and email for the new user.',
      });
      return;
    }

    setIsCreating(true);
    try {
      if (!token) throw new Error('No authentication token');

      // Clean up payload
      const payload: any = { ...newUser };
      if (payload.managerId === 'none') delete payload.managerId;
      if (payload.linkedCustomerId === 'none') delete payload.linkedCustomerId;

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prev => [data.user, ...prev]);
        setIsCreateDialogOpen(false);
        setNewUser({ name: '', email: '', role: 'customer', managerId: 'none', linkedCustomerId: 'none' });
        toast({
          title: 'User Created',
          description: `${data.user.name} has been added to the system.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to create user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create user',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!editingUser.name) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'User name cannot be empty.',
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (!token) throw new Error('No authentication token');

      const payload: any = {
        name: editingUser.name,
        role: editingUser.role,
        status: editingUser.status,
        managerId: editingUser.managerId === 'none' ? null : editingUser.managerId,
      };

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === editingUser.id ? data.user : user
          )
        );
        setIsEditDialogOpen(false);
        setEditingUser(null);
        toast({
          title: 'User Updated',
          description: `${data.user.name}'s information has been updated.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to update user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      if (!token) throw new Error('No authentication token');
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      const data = await response.json();

      if (data.success) {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
        toast({
          title: 'User Deleted',
          description: `${user.name} has been removed from the system.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to delete user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-headline">User Management</CardTitle>
            <CardDescription>Create, view, and manage all users in the system.</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Enter the details for the new user and assign them a role.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-user-name" className="text-right">Name</Label>
                  <Input
                    id="new-user-name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-user-email" className="text-right">Email</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="e.g. john.doe@example.com"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-user-role" className="text-right">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: User['role']) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map(role => (
                        <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Linked Customer for Compliance Role */}
                {newUser.role === 'compliance' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-user-customer" className="text-right">Link Customer</Label>
                    <Select
                      value={newUser.linkedCustomerId || 'none'}
                      onValueChange={(value) => setNewUser({ ...newUser, linkedCustomerId: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Customer...</SelectItem>
                        {users.filter(u => u.role === 'customer').map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Manager Selection (for Auditor/Customer) */}
                {(newUser.role === 'auditor' || newUser.role === 'customer') && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-user-manager" className="text-right">Manager</Label>
                    <Select
                      value={newUser.managerId || 'none'}
                      onValueChange={(value) => setNewUser({ ...newUser, managerId: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managers.map(mgr => (
                          <SelectItem key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email..."
              className="pl-8 sm:w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {userRoles.map(role => (
                <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className='capitalize'>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'outline'}>{user.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <TimeAgo date={user.lastActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditClick(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem><KeyRound className="mr-2 h-4 w-4" />Reset Password</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update the user's information and role.
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-user-name" className="text-right">Name</Label>
                  <Input
                    id="edit-user-name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-user-email" className="text-right">Email</Label>
                  <Input
                    id="edit-user-email"
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-user-role" className="text-right">Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value: User['role']) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map(role => (
                        <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manager Selection (Edit) */}
                {(editingUser.role === 'auditor' || editingUser.role === 'customer') && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-user-manager" className="text-right">Manager</Label>
                    <Select
                      value={editingUser.managerId || 'none'}
                      onValueChange={(value) => setEditingUser({ ...editingUser, managerId: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managers.map(mgr => (
                          <SelectItem key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateUser} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
