import React from "react";
import Badge from "./ui/Badge";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case "sent":
      return (
        <Badge color="green" className="gap-1">
          <CheckCircle2 size={12} /> Enviado
        </Badge>
      );

    case "scheduled":
      return (
        <Badge color="yellow" className="gap-1">
          <Clock size={12} /> Agendado
        </Badge>
      );

    case "failed":
      return (
        <Badge color="red" className="gap-1">
          <XCircle size={12} /> Falhou
        </Badge>
      );

    case "processing":
      return (
        <Badge color="blue" className="gap-1">
          <Loader2 className="animate-spin" size={12} /> Processando
        </Badge>
      );

    default:
      return <Badge color="gray">—</Badge>;
  }
};

export default StatusBadge;
