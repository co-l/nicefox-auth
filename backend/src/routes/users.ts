import { Router, Request, Response } from 'express'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { listAllUsers, getUserById, changeUserRole, removeUser } from '../services/user.js'

const router = Router()

// All routes require authentication and admin access
router.use(authMiddleware)
router.use(adminMiddleware)

// GET /api/users - List all users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await listAllUsers()
    
    // Remove sensitive fields
    const safeUsers = users.map(({ googleId, ...user }) => user)
    res.json({ users: safeUsers })
  } catch (error) {
    console.error('Error listing users:', error)
    res.status(500).json({ error: 'Failed to list users' })
  }
})

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.params.id)
    
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { googleId, ...safeUser } = user
    res.json({ user: safeUser })
  } catch (error) {
    console.error('Error getting user:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

// PATCH /api/users/:id - Update user (role only)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { role } = req.body

    if (!role || !['user', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' })
      return
    }

    // Prevent admin from demoting themselves
    if (req.user && req.params.id === req.user.id && role !== 'admin') {
      res.status(400).json({ error: 'Cannot change your own role' })
      return
    }

    const user = await changeUserRole(req.params.id, role)
    
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { googleId, ...safeUser } = user
    res.json({ user: safeUser })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user && req.params.id === req.user.id) {
      res.status(400).json({ error: 'Cannot delete your own account' })
      return
    }

    const deleted = await removeUser(req.params.id)
    
    if (!deleted) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
