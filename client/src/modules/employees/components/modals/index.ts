// Barrel — re-exports everything from the modal folder
export { default as AddEmployeeModal } from './AddEmployeeModal';
export { default as EditEmployeeModal } from './EditEmployeeModal';
export { default as ManagerPicker } from './ManagerPicker';
export { default as EducationSection } from './EducationSection';
export { default as ExperienceSection } from './ExperienceSection';
export { default as Field } from './Field';
export type { AddEmployeeForm, EditEmployeeForm, EduEntry, ExpEntry } from './shared';
export { emptyEdu, emptyExp, inputCls, DEPTS, EMP_TYPES, DEGREES } from './shared';
