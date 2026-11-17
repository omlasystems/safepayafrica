import Dashboard from "./dashboard-client";

type DashboardPageProps = {
  searchParams: Promise<{ auth?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { auth } = await searchParams;
  const initialAuthMode =
    auth === "signin" || auth === "signup" ? auth : undefined;

  return <Dashboard initialAuthMode={initialAuthMode} />;
}
