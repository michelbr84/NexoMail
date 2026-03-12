"use client";
import { useState, useEffect } from "react";
import { Bell, Mail, Star, AlertOctagon } from "lucide-react";

const STORAGE_KEY = "nexomail_notifications";

interface NotificationPrefs {
  newEmail: boolean;
  unreadReminder: boolean;
  starred: boolean;
  spam: boolean;
}

const defaults: NotificationPrefs = {
  newEmail: true,
  unreadReminder: false,
  starred: true,
  spam: false,
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaults);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPrefs({ ...defaults, ...JSON.parse(saved) });
    } catch {}
  }, []);

  const update = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const items = [
    {
      key: "newEmail" as const,
      icon: Mail,
      label: "Novos emails",
      description: "Notificar ao receber um novo email na caixa de entrada",
    },
    {
      key: "unreadReminder" as const,
      icon: Bell,
      label: "Lembrete de não lidos",
      description: "Lembrar de emails não lidos ao abrir o NexoMail",
    },
    {
      key: "starred" as const,
      icon: Star,
      label: "Emails com estrela",
      description: "Notificar quando um email for marcado com estrela",
    },
    {
      key: "spam" as const,
      icon: AlertOctagon,
      label: "Alertas de spam",
      description: "Notificar quando emails suspeitos forem detectados",
    },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-semibold mb-1">Notificações</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Escolha quais eventos geram notificações no NexoMail.
      </p>

      <div className="rounded-lg border border-border divide-y divide-border">
        {items.map(({ key, icon: Icon, label, description }) => (
          <div key={key} className="flex items-center gap-4 px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Toggle checked={prefs[key]} onChange={(v) => update(key, v)} />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        As preferências são salvas localmente neste dispositivo.
      </p>
    </div>
  );
}
