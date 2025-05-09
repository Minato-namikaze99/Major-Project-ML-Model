export interface Database {
    public: {
      Tables: {
        linux_logs: {
          Row: {
            LineId: number;
            Month: string | null;
            Date: number | null;
            Time: string | null;
            Level: string | null;
            Component: string | null;
            PID: number | null;
            Content: string | null;
            EventId: string | null;
            EventTemplate: string | null;
          };
          Insert: {
            LineId: number;
            Month?: string | null;
            Date?: number | null;
            Time?: string | null;
            Level?: string | null;
            Component?: string | null;
            PID?: number | null;
            Content?: string | null;
            EventId?: string | null;
            EventTemplate?: string | null;
          };
          Update: {
            LineId?: number;
            Month?: string | null;
            Date?: number | null;
            Time?: string | null;
            Level?: string | null;
            Component?: string | null;
            PID?: number | null;
            Content?: string | null;
            EventId?: string | null;
            EventTemplate?: string | null;
          };
        };
      };
      Views: {
        [_ in never]: never;
      };
      Functions: {
        [_ in never]: never;
      };
      Enums: {
        [_ in never]: never;
      };
    };
  }