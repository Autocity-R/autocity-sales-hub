import React, { useState } from "react";
import { Bell, AlertCircle, Clock, ClipboardCheck, Truck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCurrentBranch } from "@/contexts/BranchContext";
import { useAftersalesNotifications, type AftersalesNotification } from "@/hooks/useAftersalesNotifications";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const kindIcon = (n: AftersalesNotification) => {
  switch (n.kind) {
    case "warranty_overdue":
    case "warranty_warning":
      return AlertCircle;
    case "workorder_review":
      return ClipboardCheck;
    case "delivery_not_ready":
      return Truck;
    case "intake_pending":
      return Inbox;
    default:
      return Clock;
  }
};

const dotClass = (sev: string) =>
  sev === "red" ? "bg-red-500" : sev === "orange" ? "bg-orange-500" : "bg-slate-400";

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { branchFilter } = useCurrentBranch();
  const { notifications, unreadCount, readIds, markRead, markAllRead } =
    useAftersalesNotifications(branchFilter);

  const onClickItem = (n: AftersalesNotification) => {
    markRead(n.id);
    setOpen(false);
    navigate(n.href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-sm">Meldingen</div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nieuw
              </Badge>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead()}
              >
                Alles als gelezen
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Geen meldingen — alles onder controle.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = kindIcon(n);
                const isRead = readIds.has(n.id);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => onClickItem(n)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted/60 flex gap-3 items-start transition-colors",
                        !isRead && "bg-muted/30"
                      )}
                    >
                      <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", dotClass(n.severity))} />
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm", !isRead ? "font-semibold" : "font-medium")}>
                          {n.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{n.detail}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: nl })}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};