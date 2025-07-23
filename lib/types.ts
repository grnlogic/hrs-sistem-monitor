export type Violation = {
  id: string;
  karyawanId: string;
  type: string;
  severity: string;
  status: string;
  date: string;
  description: string;
  sanction: string;
  reportedBy: string;
  // tambahkan field lain sesuai kebutuhan
}

export type Employee = {
  joinDate: string | number | Date;
  status: string;
  id: string;
  name: string;
  nip: string;
  email: string;
  department: string;
  position: string;
  avatar?: string;
  // tambahkan field lain sesuai kebutuhan
} 