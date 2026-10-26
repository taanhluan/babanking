function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === 'string' ? entry.trim() : '';
}

function nullable(formData: FormData, name: string) {
  return value(formData, name) || null;
}

export function assignmentFromForm(formData: FormData) {
  return {
    projectId: value(formData, 'projectId'),
    roleId: value(formData, 'roleId'),
    percent: value(formData, 'percent'),
    billableStatus: value(formData, 'billableStatus'),
    startDate: value(formData, 'startDate'),
    endDate: nullable(formData, 'endDate'),
  };
}

export function overAllocationConfirmed(formData: FormData) {
  return value(formData, 'confirmOverAllocation') === '1';
}

export function assessmentFromForm(formData: FormData) {
  return { performance: nullable(formData, 'performance'), risk: nullable(formData, 'risk'), managerRemark: nullable(formData, 'managerRemark') };
}

export function profileFromForm(formData: FormData) {
  return { level: nullable(formData, 'level'), capacityPercent: value(formData, 'capacityPercent'), hoursPerWeek: value(formData, 'hoursPerWeek') };
}

export function flag(formData: FormData, name: string) {
  return value(formData, name) === 'true';
}

export function text(formData: FormData, name: string) {
  return value(formData, name);
}
