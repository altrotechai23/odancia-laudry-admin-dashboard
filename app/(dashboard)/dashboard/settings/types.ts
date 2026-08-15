export type SettingsSection = {
  title: string;
  description: string;
  href: string;
  icon:
    | "user"
    | "building"
    | "bell"
    | "shield"
    | "database"
    | "palette";
  available: boolean;
};