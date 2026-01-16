import { useEffect, useState } from "react";
import DataTable from 'react-data-table-component';
import Swal from 'sweetalert2';
import { getUsers, createUser, deleteUser, updateUser, getRoles, createRole, deleteRole } from "../../api/admin";
import { useNavigate } from "react-router-dom";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    role_name: ''
  });
  const [newRole, setNewRole] = useState({ name: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Add this state

  // Check role from localStorage - ALWAYS called
  useEffect(() => {
    const role = localStorage.getItem("role");
    
    if (role !== "admin") {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You are not authorized to access this page. Only admins can access.',
        confirmButtonText: 'Go to back',
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        navigate("/books");
      });
    } else {
      setIsAdmin(true); // Set admin status if role is admin
    }
  }, [navigate]);

  // Load data ONLY if admin
  useEffect(() => {
    if (isAdmin) {
      const loadData = async () => {
        try {
          const [usersRes, rolesRes] = await Promise.all([getUsers(), getRoles()]);
          setUsers(usersRes.data);
          setRoles(rolesRes.data);
        } catch (error) {
          console.error('Failed to load data:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load data',
            timer: 2000
          });
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [isAdmin]); // Run when isAdmin changes

  // If not admin, show redirect message
  if (!isAdmin) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
          <h3>Redirecting to books page...</h3>
          <p>Please wait while we redirect you.</p>
        </div>
      </div>
    );
  }

  // Rest of your functions remain the same...
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.role_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Username, password, and role are required',
        timer: 2000
      });
      return;
    }

    try {
      const userData = {
        username: newUser.username,
        password: newUser.password,
        role_names: [newUser.role_name]
      };
      
      await createUser(userData);
      setNewUser({ username: '', password: '', role_name: '' });
      setShowAddUserForm(false);
      
      // Reload users
      const usersRes = await getUsers();
      setUsers(usersRes.data);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User created successfully',
        timer: 1500
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to create user: ' + (error.response?.data?.message || error.message),
        timer: 2000
      });
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRole.name) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Role name is required',
        timer: 2000
      });
      return;
    }

    try {
      await createRole(newRole.name);
      setNewRole({ name: '' });
      setShowAddRoleForm(false);
      
      // Reload roles
      const rolesRes = await getRoles();
      setRoles(rolesRes.data);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Role created successfully',
        timer: 1500
      });
    } catch (error) {
      console.error('Failed to create role:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to create role: ' + (error.response?.data?.message || error.message),
        timer: 2000
      });
    }
  };

  const handleDeleteUser = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await deleteUser(id);
        
        // Reload users
        const usersRes = await getUsers();
        setUsers(usersRes.data);
        
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'User has been deleted.',
          timer: 1500
        });
      } catch (error) {
        console.error('Delete failed:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete user',
          timer: 2000
        });
      }
    }
  };

  const handleDeleteRole = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await deleteRole(id);
        
        // Reload roles
        const rolesRes = await getRoles();
        setRoles(rolesRes.data);
        
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Role has been deleted.',
          timer: 1500
        });
      } catch (error) {
        console.error('Delete failed:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete role',
          timer: 2000
        });
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    
    let userRole = '';
    if (Array.isArray(user.roles) && user.roles.length > 0) {
      userRole = user.roles[0];
    } else if (Array.isArray(user.role_names) && user.role_names.length > 0) {
      userRole = user.role_names[0];
    } else if (user.role) {
      userRole = user.role;
    }
    
    setNewUser({ 
      username: user.username, 
      password: '',
      role_name: userRole 
    });
    setShowAddUserForm(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.role_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Username and role are required',
        timer: 2000
      });
      return;
    }

    try {
      const updateData = {
        username: newUser.username,
        role_names: [newUser.role_name]
      };
      
      if (newUser.password.trim()) {
        updateData.password = newUser.password;
      }

      await updateUser(editingUser.id, updateData);
      setEditingUser(null);
      setNewUser({ username: '', password: '', role_name: '' });
      setShowAddUserForm(false);
      
      // Reload users
      const usersRes = await getUsers();
      setUsers(usersRes.data);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User updated successfully',
        timer: 1500
      });
    } catch (error) {
      console.error('Failed to update user:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update user: ' + (error.response?.data?.message || error.message),
        timer: 2000
      });
    }
  };

  const userColumns = [
    {
      name: 'ID',
      selector: row => row.id,
      sortable: true,
      width: '80px'
    },
    {
      name: 'Username',
      selector: row => row.username,
      sortable: true,
    },
    {
      name: 'Role',
      selector: row => {
        if (Array.isArray(row.roles) && row.roles.length > 0) {
          return row.roles[0];
        } else if (Array.isArray(row.role_names) && row.role_names.length > 0) {
          return row.role_names[0];
        } else if (row.role) {
          return row.role;
        }
        return 'No role assigned';
      },
      sortable: true,
    },
    {
      name: 'Actions',
      cell: row => (
        <div className="action-buttons">
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => handleEditUser(row)}
          >
            Edit
          </button>
          <button 
            className="btn btn-sm btn-danger"
            onClick={() => handleDeleteUser(row.id)}
          >
            Delete
          </button>
        </div>
      ),
      width: '180px'
    },
  ];

  const roleColumns = [
    {
      name: 'ID',
      selector: row => row.id,
      sortable: true,
      width: '80px'
    },
    {
      name: 'Role Name',
      selector: row => row.name,
      sortable: true,
    },
  ];

  return (
    <div className="container">
      <div className="card">
        <div className="page-header">
          <h2>User & Role Management</h2>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button 
            className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Roles ({roles.length})
          </button>
        </div>

        {activeTab === 'users' && (
          <>
            <div className="page-header">
              <h3>Users Management</h3>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setEditingUser(null);
                  setNewUser({ username: '', password: '', role_name: '' });
                  setShowAddUserForm(!showAddUserForm);
                }}
              >
                {showAddUserForm ? 'Cancel' : 'Add User'}
              </button>
            </div>

            {showAddUserForm && (
              <div className="upload-section card">
                <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
                <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      className="form-control"
                      placeholder="Username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{editingUser ? 'New Password (Leave empty to keep current)' : 'Password *'}</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="Password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      required={!editingUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>Select Role *</label>
                    <div className="roles-radio-list">
                      {roles.length === 0 ? (
                        <p className="text-muted">No roles available. Please create roles first.</p>
                      ) : (
                        roles.map(role => (
                          <div key={role.id} className="role-radio-item">
                            <input
                              type="radio"
                              id={`role-${role.id}`}
                              name="user-role"
                              value={role.name}
                              checked={newUser.role_name === role.name}
                              onChange={(e) => setNewUser({...newUser, role_name: e.target.value})}
                            />
                            <label htmlFor={`role-${role.id}`}>
                              {role.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="form-buttons">
                    <button type="submit" className="btn btn-primary">
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddUserForm(false);
                        setEditingUser(null);
                        setNewUser({ username: '', password: '', role_name: '' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <DataTable
              columns={userColumns}
              data={users}
              pagination
              paginationPerPage={10}
              progressPending={loading}
              highlightOnHover
              striped
              responsive
              noDataComponent="No users found"
            />
          </>
        )}

        {activeTab === 'roles' && (
          <>
            <div className="page-header">
              <h3>Roles Management</h3>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowAddRoleForm(!showAddRoleForm)}
              >
                {showAddRoleForm ? 'Cancel' : 'Add Role'}
              </button>
            </div>

            {showAddRoleForm && (
              <div className="upload-section card">
                <h3>Add New Role</h3>
                <form onSubmit={handleAddRole}>
                  <div className="form-group">
                    <label>Role Name *</label>
                    <input
                      className="form-control"
                      placeholder="Role Name"
                      value={newRole.name}
                      onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-buttons">
                    <button type="submit" className="btn btn-primary">Create Role</button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddRoleForm(false);
                        setNewRole({ name: '' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <DataTable
              columns={roleColumns}
              data={roles}
              pagination
              paginationPerPage={10}
              progressPending={loading}
              highlightOnHover
              striped
              responsive
              noDataComponent="No roles found"
            />
          </>
        )}
      </div>

      <style jsx>{`
        .container {
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        .tab {
          padding: 10px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
        }
        .tab.active {
          border-bottom-color: #007bff;
          color: #007bff;
        }
        .upload-section {
          margin-bottom: 20px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
        }
        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .form-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        .btn-danger {
          background: #dc3545;
          color: white;
        }
        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        .roles-radio-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          max-height: 200px;
          overflow-y: auto;
        }
        .role-radio-item {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 120px;
        }
        .role-radio-item input[type="radio"] {
          width: 16px;
          height: 16px;
        }
        .role-radio-item label {
          margin: 0;
          font-weight: normal;
          cursor: pointer;
        }
        .text-muted {
          color: #6c757d;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}