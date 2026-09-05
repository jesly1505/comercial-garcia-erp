import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Obtener todos los roles con sus permisos
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { users: true }
        }
      }
    });

    // Formatear respuesta para que sea fácil de consumir en Frontend
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      userCount: role._count.users,
      permissions: role.rolePermissions.map(rp => rp.permission.code)
    }));

    res.json(formattedRoles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

// Crear un nuevo rol con permisos
export const createRole = async (req: Request, res: Response): Promise<void> => {
  const { name, description, permissions } = req.body;

  try {
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
      return;
    }

    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: { name, description }
      });

      if (permissions && Array.isArray(permissions)) {
        const permissionRecords = await tx.permission.findMany({
          where: { code: { in: permissions } }
        });
        
        if (permissionRecords.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionRecords.map(p => ({
              roleId: newRole.id,
              permissionId: p.id
            }))
          });
        }
      }

      return newRole;
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Error al crear el rol' });
  }
};

// Actualizar un rol y sus permisos
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  try {
    const existing = await prisma.role.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    if (existing.name === 'ADMIN') {
      res.status(403).json({ error: 'No se puede editar al administrador del sistema' });
      return;
    }

    const role = await prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id: Number(id) },
        data: { name, description }
      });

      if (permissions && Array.isArray(permissions)) {
        // Borrar todos los permisos actuales
        await tx.rolePermission.deleteMany({
          where: { roleId: Number(id) }
        });

        // Insertar nuevos
        const permissionRecords = await tx.permission.findMany({
          where: { code: { in: permissions } }
        });
        
        if (permissionRecords.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionRecords.map(p => ({
              roleId: Number(id),
              permissionId: p.id
            }))
          });
        }
      }

      return updatedRole;
    });

    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Error al actualizar el rol' });
  }
};

// Eliminar un rol
export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const existing = await prisma.role.findUnique({ where: { id: Number(id) } });
    
    if (!existing) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    if (existing.name === 'ADMIN' || existing.name === 'Vendedor') {
      res.status(403).json({ error: 'No se pueden eliminar los roles del sistema base' });
      return;
    }

    const usersWithRole = await prisma.user.count({ where: { roleId: Number(id) } });
    if (usersWithRole > 0) {
      res.status(400).json({ error: 'No se puede eliminar un rol que tiene usuarios asignados' });
      return;
    }

    await prisma.role.delete({ where: { id: Number(id) } });
    res.json({ message: 'Rol eliminado con éxito' });
  } catch (error) {
    console.error('Error in deleteRole:', error);
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
};

export const toggleRoleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleId = Number(req.params.id);
    
    if (isNaN(roleId)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }

    if (role.name === 'ADMIN') {
      res.status(403).json({ error: 'No se puede desactivar el rol Administrador' });
      return;
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: { isActive: !role.isActive }
    });

    res.json(updatedRole);
  } catch (error) {
    console.error('Error in toggleRoleStatus:', error);
    res.status(500).json({ error: 'Error al cambiar estado del rol' });
  }
};

// Obtener la lista maestra de permisos disponibles en el sistema
export const getPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Error al obtener permisos' });
  }
};
