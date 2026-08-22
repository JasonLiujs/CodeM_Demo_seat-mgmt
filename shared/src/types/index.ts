/**
 * 工位管理系统 — 共享类型定义
 * 前后端共享的 Entity / DTO / 枚举类型
 */

// ============================================================================
// 枚举类型
// ============================================================================

/** 工位状态 */
export enum SeatStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
}

/** 工位类型 */
export enum SeatType {
  STANDARD = 'standard',
  STANDING = 'standing',
  MEETING = 'meeting',
  PRIVATE = 'private',
}

/** 分配类型 */
export enum AssignmentType {
  FIXED = 'fixed',
  FLEXIBLE = 'flexible',
}

/** 分配状态 */
export enum AssignmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** 预订状态 */
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/** 变更日志动作 */
export enum ChangeLogAction {
  CREATE_SEAT = 'create_seat',
  UPDATE_SEAT = 'update_seat',
  DELETE_SEAT = 'delete_seat',
  ASSIGN = 'assign',
  UNASSIGN = 'unassign',
  TRANSFER = 'transfer',
  BATCH_ASSIGN = 'batch_assign',
  BOOK = 'book',
  CANCEL_BOOKING = 'cancel_booking',
  IMPORT = 'import',
}

// ============================================================================
// Entity 类型（对应数据库表结构）
// ============================================================================

/** 部门实体 */
export interface Department {
  id: number;
  name: string;
  createdAt: string;
}

/** 楼层平面图实体 */
export interface FloorPlan {
  id: number;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

/** 工位实体 */
export interface Seat {
  id: number;
  code: string;
  area: string;
  type: SeatType;
  x: number;
  y: number;
  w: number;
  h: number;
  floorPlanId: number | null;
  status: SeatStatus;
  createdAt: string;
}

/** 员工实体 */
export interface Employee {
  id: number;
  empNo: string;
  name: string;
  departmentId: number | null;
  seatId: number | null;
  createdAt: string;
}

/** 分配实体 */
export interface Assignment {
  id: number;
  seatId: number;
  employeeId: number;
  assignedAt: string;
  assignedBy: string;
  type: AssignmentType;
  status: AssignmentStatus;
}

/** 预订实体 */
export interface Booking {
  id: number;
  seatId: number;
  employeeId: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
}

/** 变更日志实体 */
export interface ChangeLog {
  id: number;
  action: ChangeLogAction;
  seatId: number | null;
  employeeId: number | null;
  oldSeatId: number | null;
  newSeatId: number | null;
  operator: string;
  reason: string | null;
  createdAt: string;
}

// ============================================================================
// DTO 类型（数据传输对象）
// ============================================================================

/** 创建工位 DTO */
export interface CreateSeatDto {
  code: string;
  area: string;
  type: SeatType;
  x: number;
  y: number;
  w: number;
  h: number;
  floorPlanId?: number | null;
  status?: SeatStatus;
}

/** 更新工位 DTO */
export interface UpdateSeatDto {
  code?: string;
  area?: string;
  type?: SeatType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  floorPlanId?: number | null;
  status?: SeatStatus;
}

/** 工位过滤 DTO */
export interface SeatFilterDto {
  area?: string;
  type?: SeatType;
  status?: SeatStatus;
  floorPlanId?: number;
}

/** 创建员工 DTO */
export interface CreateEmployeeDto {
  empNo: string;
  name: string;
  departmentId?: number | null;
}

/** 员工过滤 DTO */
export interface EmployeeFilterDto {
  departmentId?: number;
  name?: string;
}

/** 分配 DTO */
export interface AssignDto {
  seatId: number;
  employeeId: number;
  assignedBy: string;
  type?: AssignmentType;
}

/** 批量分配 DTO */
export interface BatchAssignDto {
  pairs: Array<{ seatId: number; employeeId: number }>;
  assignedBy: string;
}

/** 转移 DTO */
export interface TransferDto {
  employeeId: number;
  newSeatId: number;
  operator: string;
}

/** 创建预订 DTO */
export interface CreateBookingDto {
  seatId: number;
  employeeId: number;
  startTime: string;
  endTime: string;
}

/** 预订过滤 DTO */
export interface BookingFilterDto {
  seatId?: number;
  employeeId?: number;
  status?: BookingStatus;
}

// ============================================================================
// 统计 DTO
// ============================================================================

/** 统计概览 */
export interface StatsOverview {
  totalSeats: number;
  availableSeats: number;
  occupiedSeats: number;
  reservedSeats: number;
  maintenanceSeats: number;
  totalEmployees: number;
  assignedEmployees: number;
  unassignedEmployees: number;
  activeBookings: number;
}

/** 按区域统计 */
export interface StatsByArea {
  area: string;
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
}

/** 按部门统计 */
export interface StatsByDepartment {
  departmentId: number | null;
  departmentName: string;
  totalEmployees: number;
  assignedEmployees: number;
}

/** 趋势数据点 */
export interface StatsTrendPoint {
  date: string;
  assigned: number;
  booked: number;
}

// ============================================================================
// 统一 API 响应
// ============================================================================

/** 成功响应 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** 错误响应 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/** API 响应联合类型 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ============================================================================
// 服务层接口约定（供后续需求实现）
// ============================================================================

/** 座位服务接口 */
export interface ISeatService {
  listSeats(filter: SeatFilterDto): Promise<Seat[]>;
  createSeat(data: CreateSeatDto): Promise<Seat>;
  updateSeat(id: number, data: UpdateSeatDto): Promise<Seat>;
  deleteSeat(id: number): Promise<void>;
}

/** 分配服务接口 */
export interface IAssignService {
  assign(seatId: number, empId: number, assignedBy: string): Promise<Assignment>;
  unassign(id: number): Promise<void>;
  transfer(empId: number, newSeatId: number, operator: string): Promise<Assignment>;
  batchAssign(pairs: Array<{ seatId: number; employeeId: number }>, assignedBy: string): Promise<Assignment[]>;
  relocate(deptId: number, targetArea: string): Promise<void>;
}

/** 预订服务接口 */
export interface IBookingService {
  createBooking(seatId: number, empId: number, start: string, end: string): Promise<Booking>;
  cancelBooking(id: number): Promise<void>;
  listBookings(filter: BookingFilterDto): Promise<Booking[]>;
  expireBookings(): Promise<void>;
}

/** 统计服务接口 */
export interface IStatsService {
  getOverview(): Promise<StatsOverview>;
  getByArea(): Promise<StatsByArea[]>;
  getTrends(days: number): Promise<StatsTrendPoint[]>;
  getDepartments(): Promise<StatsByDepartment[]>;
}

/** 员工服务接口 */
export interface IEmployeeService {
  listEmployees(filter: EmployeeFilterDto): Promise<Employee[]>;
  createEmployee(data: CreateEmployeeDto): Promise<Employee>;
}

// ============================================================================
// 注册点接口（供后续需求接入扩展）
// ============================================================================

/** 统计提供者接口 */
export interface IStatsProvider {
  name: string;
  compute(): Promise<Record<string, unknown>>;
}

/** 工位类型接口 */
export interface ISeatType {
  type: SeatType;
  label: string;
  icon?: string;
}

/** 导入器接口 */
export interface IImporter {
  format: string;
  import(file: Buffer): Promise<void>;
}

// ============================================================================
// 前端组件接口约定
// ============================================================================

/** FloorPlanEditor 组件 Props */
export interface FloorPlanEditorProps {
  floorPlanId: number;
  onSeatCreate: (data: CreateSeatDto) => void;
  onSeatUpdate: (id: number, data: UpdateSeatDto) => void;
  onSeatDelete: (id: number) => void;
}

/** FloorPlanViewer 组件 Props */
export interface FloorPlanViewerProps {
  floorPlanId: number;
  highlightSeatId?: number;
  highlightDepartment?: number;
  searchQuery?: string;
  filterStatus?: SeatStatus;
}

/** PropertyPanel 组件 Props */
export interface PropertyPanelProps {
  seat: Seat | null;
  onChange: (data: UpdateSeatDto) => void;
  onDelete: (id: number) => void;
}
