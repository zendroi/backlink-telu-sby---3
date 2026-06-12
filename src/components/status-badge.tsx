import clsx from "clsx";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-extrabold",
        status === "cocok" && "bg-green-100 text-green-700",
        status === "tidak cocok" && "bg-red-100 text-red-700",
        status === "belum dicek" && "bg-slate-100 text-slate-700",
        !["cocok", "tidak cocok", "belum dicek"].includes(status) &&
          "bg-amber-100 text-amber-800"
      )}
    >
      {status}
    </span>
  );
}
