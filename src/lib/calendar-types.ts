export type CalendarFilter = "sales" | "subscriptions" | "rent" | "production" | "projects" | "leave";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: CalendarFilter;
  url: string;
  color?: string;
}
