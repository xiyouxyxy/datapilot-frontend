// 全局类型与接口契约。所有后端返回统一 BaseResponse<T>，经请求层拦截器解包为 T。

export interface BaseResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export interface UserInfo {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
}

export interface LoginReq {
  username: string;
  password: string;
}

export interface LoginRes {
  token: string;
  userInfo: UserInfo;
}

export interface PermissionData {
  menus: string[];
  buttons: string[];
  fields: string[];
}

export type EmployeeStatus = '在职' | '试用期' | '离职';
export type Gender = '男' | '女';

export interface Employee {
  id: number;
  name: string;
  gender: Gender;
  dept: string;
  position: string;
  salary: number;
  phone: string;
  email: string;
  entryDate: string;
  status: EmployeeStatus;
  idCard: string;
  role?: string; // P0-3 多步表单扩展：角色
  attachment?: string; // P0-3 多步表单扩展：附件文件名（展示用）
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  pageSize: number;
}

export interface EmployeeQuery {
  current?: number;
  pageSize?: number;
  filters?: {
    name?: string;
    dept?: string;
    position?: string;
    status?: string;
    gender?: string;
  };
}

export interface DashboardSummary {
  kpis: { title: string; value: number; unit: string; trend: number }[];
  trend: { date: string; value: number }[];
  deptDist: { name: string; value: number }[];
  positionDist: { name: string; value: number }[];
  radar: { name: string; value: number }[];
  rank: { name: string; value: number }[];
  filterDept?: string;
}

export type WorkflowType = 'leave' | 'reimburse' | 'travel';
export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface WorkflowNode {
  name: string;
  approver: string;
  status: 'done' | 'current' | 'wait';
  time?: string;
  comment?: string;
}

export interface WorkflowTask {
  id: string;
  type: WorkflowType;
  title: string;
  applicant: string;
  amount?: number;
  status: WorkflowStatus;
  currentNode: string;
  createdAt: string;
  nodes: WorkflowNode[];
}

export type MessageType = 'todo' | 'notice' | 'system';

export interface AppMessage {
  id: string;
  type: MessageType;
  title: string;
  content: string;
  time: string;
  read: boolean;
}
