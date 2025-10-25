import DriverEditorShell from "../components/DriverEditorShell";

type PlainDriver = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  homeBase?: string | null;
  licenseNumber: string;
  licenseJurisdiction: string;
  licenseClass: string;
  licenseEndorsements: string[];
  licenseExpiresAt: string;
  medicalExpiresAt?: string | null;
  drugTestDate?: string | null;
  mvrDate?: string | null;
  payType?: "Hourly" | "CPM" | null;
  rate?: number | null;
  cpm?: number | null;
  deductionsProfileId?: string | null;
  status: "Active" | "Inactive";
  inactiveReason?: string | null;
  inactiveAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default async function Page() {
  const oneYearOut = new Date();
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

  const emptyDriver: PlainDriver = {
    name: "",
    phone: null,
    email: null,
    homeBase: null,
    licenseNumber: "",
    licenseJurisdiction: "",
    licenseClass: "",
    licenseEndorsements: [],
    licenseExpiresAt: oneYearOut.toISOString(),
    medicalExpiresAt: null,
    drugTestDate: null,
    mvrDate: null,
    payType: null,
    rate: null,
    cpm: null,
    deductionsProfileId: null,
    status: "Active",
    inactiveReason: null,
    inactiveAt: null,
  };

  const terminals = ["Toronto", "Guelph", "Ottawa"];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Driver onboarding</p>
        <h1 className="text-2xl font-semibold">Add a new driver</h1>
      </header>
      <DriverEditorShell mode="create" driver={emptyDriver} terminals={terminals} />
    </div>
  );
}
