export type User = {
  id: number;
  personnel_number: string;
  display_name: string;
  role: string;
  language?: string;
  locale?: string;
};

export type Site = {
  site_id: string;
  hotel_name: string;
  brand?: string;
  city?: string;
  country_code?: string;
};

export type Building = {
  id: number;
  bl_id: string;
  site_id: string;
  name: string;
  active: boolean;
  hotel_name?: string;
  city?: string;
};

export type Room = {
  id: number;
  room_code: string;
  name?: string;
  room_type?: string;
};

export type Asset = {
  id: number;
  asset_code: string;
  description?: string;
  sgn?: string;
  standard_asset_name?: string;
};

export type Ticket = {
  id: number;
  ticket_no: string;
  site_id: string;
  hotel_name?: string;
  building_name?: string;
  room_code?: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "DONE";
  priority?: string;
  due_date?: string;
  assigned_group?: string;
};

export type ChecklistRun = {
  id: number;
  site_id: string;
  building_id?: number;
  room_id?: number;
  asset_id?: number;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "MISSED";
  due_date?: string;
  assigned_group?: string;
  plan_frequency?: string;
  plan_interval_value?: number;
  template_title?: string;
  template_title_de?: string;
  template_title_en?: string;
  building_name?: string;
  asset_code?: string;
  asset_description?: string;
  room_code?: string;
  room_description?: string;
};
