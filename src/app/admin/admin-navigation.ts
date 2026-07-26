export function getAdminOperations(isVietnamese: boolean, showJourneyCms: boolean) {
  const operations = [
    [isVietnamese ? 'Quản lý hội viên' : 'Membership Operations', '/admin/memberships'],
    [isVietnamese ? 'Quản lý người dùng' : 'Manage Users', '/admin/users'],
    [isVietnamese ? 'Kiểm soát quyền kiến thức' : 'Knowledge Access Control', '/admin/access-control'],
    [isVietnamese ? 'Quản lý nội dung' : 'Manage Content', '/admin/content'],
    [isVietnamese ? 'Quản lý bản dịch' : 'Manage Translations', '/admin/content/translations'],
    [isVietnamese ? 'Nhật ký kiểm toán' : 'View Audit Log', '/admin/audit'],
    [isVietnamese ? 'Môi trường hệ thống' : 'System Environment', '/admin/system/environment'],
  ] as Array<readonly [string, string]>;

  if (showJourneyCms) {
    operations.splice(4, 0, [
      isVietnamese ? 'Nội dung cộng tác viên' : 'Contributor Content',
      '/admin/contributor',
    ]);
  }
  return operations;
}
