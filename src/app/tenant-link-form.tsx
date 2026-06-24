"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { linkConversationAction } from "@/app/actions";
import type { Tenant, Unit } from "@/lib/types";

type TenantLinkFormProps = {
  conversationId: string;
  demo: boolean;
  selectedTenantId: string | null;
  selectedUnitId: string | null;
  tenants: Tenant[];
  units: Unit[];
};

export function TenantLinkForm({
  conversationId,
  demo,
  selectedTenantId,
  selectedUnitId,
  tenants,
  units,
}: TenantLinkFormProps) {
  const [unitQuery, setUnitQuery] = useState("");
  const [tenantQuery, setTenantQuery] = useState("");
  const [tenantId, setTenantId] = useState(selectedTenantId ?? "");
  const [unitId, setUnitId] = useState(selectedUnitId ?? "");
  const tenantByUnitId = useMemo(() => {
    const map = new Map<string, Tenant>();

    for (const tenant of tenants) {
      if (tenant.unit_id && !map.has(tenant.unit_id)) {
        map.set(tenant.unit_id, tenant);
      }
    }

    return map;
  }, [tenants]);

  const selectedTenant = tenants.find((tenant) => tenant.id === tenantId) ?? null;
  const selectedUnit = units.find((unit) => unit.id === unitId) ?? null;

  const unitOptions = useMemo(() => {
    const query = normalizeSearch(unitQuery);

    return units
      .filter((unit) => {
        const tenant = tenantByUnitId.get(unit.id);

        if (!query) {
          return true;
        }

        return normalizeSearch(
          [
            unit.property_name,
            unit.unit_label,
            unit.address,
            tenant?.tenant_name,
            tenant?.company_name,
            tenant?.phone_number,
            tenant?.normalized_phone,
          ].join(" "),
        ).includes(query);
      })
      .slice(0, 8);
  }, [tenantByUnitId, unitQuery, units]);

  const unassignedTenantOptions = useMemo(() => {
    const query = normalizeSearch(tenantQuery);

  return tenants
      .filter((tenant) => !tenant.unit_id)
      .filter((tenant) => {
        if (!query) {
          return true;
        }

        return normalizeSearch(
          [
            tenant.tenant_name,
            tenant.company_name,
            tenant.phone_number,
            tenant.normalized_phone,
          ].join(" "),
        ).includes(query);
      })
      .slice(0, 8);
  }, [tenantQuery, tenants]);

  function chooseUnit(unit: Unit) {
    const tenant = tenantByUnitId.get(unit.id);

    setUnitId(unit.id);
    setTenantId(tenant?.id ?? "");
    setUnitQuery("");
  }

  function chooseTenantWithoutUnit(tenant: Tenant) {
    setTenantId(tenant.id);
    setUnitId("");
    setTenantQuery("");
  }

  return (
    <form action={linkConversationAction} className="space-y-4">
      <input name="conversation_id" type="hidden" value={conversationId} />
      <input name="tenant_id" type="hidden" value={tenantId} />
      <input name="unit_id" type="hidden" value={unitId} />

      <div className="space-y-2">
        <FieldLabel label="Unit" />
        <SearchInput
          disabled={demo}
          onChange={setUnitQuery}
          placeholder="Search unit, property, tenant, company, or phone"
          value={unitQuery}
        />
        {selectedUnit ? (
          <SelectedItem
            disabled={demo}
            onClear={() => {
              setTenantId("");
              setUnitId("");
            }}
            primary={`${selectedUnit.property_name} ${selectedUnit.unit_label}`}
            secondary={[
              selectedTenant?.company_name ?? selectedTenant?.tenant_name ?? "No tenant assigned",
              selectedTenant?.phone_number,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null}
        <div className="max-h-64 overflow-auto rounded-md border border-[#e1e6dc] bg-white">
          {unitOptions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[#66746c]">No unit found.</p>
          ) : (
            unitOptions.map((unit) => {
              const tenant = tenantByUnitId.get(unit.id);

              return (
                <button
                  className={`flex w-full items-start gap-2 border-b border-[#edf0ea] px-3 py-2 text-left last:border-b-0 hover:bg-[#eef4ec] disabled:cursor-not-allowed ${
                    unit.id === unitId ? "bg-[#e9f4ee]" : "bg-white"
                  }`}
                  disabled={demo}
                  key={unit.id}
                  onClick={() => chooseUnit(unit)}
                  type="button"
                >
                  <span className="mt-0.5 text-[#0f7b5f]">
                    {unit.id === unitId ? <Check size={14} aria-hidden /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium text-[#25342c] [overflow-wrap:anywhere]">
                      {unit.property_name} {unit.unit_label}
                    </span>
                    <span className="block break-words text-xs text-[#6f7c75] [overflow-wrap:anywhere]">
                      {tenant
                        ? [
                            tenant.company_name ?? tenant.tenant_name,
                            tenant.tenant_name,
                            tenant.phone_number,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : unit.address ?? "No tenant assigned"}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel label="Tenant without unit" />
        <p className="text-xs leading-5 text-[#66746c]">
          Use this only when the tenant record has not been assigned to a unit yet.
        </p>
        <SearchInput
          disabled={demo}
          onChange={setTenantQuery}
          placeholder="Search unassigned tenant or phone"
          value={tenantQuery}
        />
        {selectedTenant && !selectedUnit ? (
          <SelectedItem
            disabled={demo}
            onClear={() => setTenantId("")}
            primary={selectedTenant.tenant_name}
            secondary={[selectedTenant.company_name, selectedTenant.phone_number]
              .filter(Boolean)
              .join(" · ")}
          />
        ) : null}
        <div className="max-h-40 overflow-auto rounded-md border border-[#e1e6dc] bg-white">
          {unassignedTenantOptions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[#66746c]">No unassigned tenant found.</p>
          ) : (
            unassignedTenantOptions.map((tenant) => (
              <button
                className={`flex w-full items-start gap-2 border-b border-[#edf0ea] px-3 py-2 text-left last:border-b-0 hover:bg-[#eef4ec] disabled:cursor-not-allowed ${
                  tenant.id === tenantId ? "bg-[#e9f4ee]" : "bg-white"
                }`}
                disabled={demo}
                key={tenant.id}
                onClick={() => chooseTenantWithoutUnit(tenant)}
                type="button"
              >
                <span className="mt-0.5 text-[#0f7b5f]">
                  {tenant.id === tenantId ? <Check size={14} aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium text-[#25342c] [overflow-wrap:anywhere]">
                    {tenant.tenant_name}
                  </span>
                  <span className="block break-words text-xs text-[#6f7c75] [overflow-wrap:anywhere]">
                    {[tenant.company_name, tenant.phone_number].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <button
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0f7b5f] px-3 text-sm font-semibold text-white transition hover:bg-[#0c684f] disabled:cursor-not-allowed disabled:bg-[#a7b4ad]"
        disabled={demo}
        type="submit"
      >
        <Check size={16} aria-hidden />
        Save link
      </button>
    </form>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <span className="block text-xs font-medium uppercase tracking-[0.08em] text-[#64726b]">
      {label}
    </span>
  );
}

function SearchInput({
  disabled,
  onChange,
  placeholder,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8a83]">
        <Search size={15} aria-hidden />
      </span>
      <input
        className="field"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{ paddingLeft: "2.75rem" }}
        type="search"
        value={value}
      />
    </label>
  );
}

function SelectedItem({
  disabled,
  onClear,
  primary,
  secondary,
}: {
  disabled: boolean;
  onClear: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-[#b8dccb] bg-[#e6f4ed] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[#17352b]">{primary}</p>
        <p className="truncate text-xs text-[#517064]">{secondary}</p>
      </div>
      <button
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#517064] hover:bg-white disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onClear}
        title="Clear"
        type="button"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
