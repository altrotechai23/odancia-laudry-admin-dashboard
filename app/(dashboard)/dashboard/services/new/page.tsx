import { getServiceTypes } from "@/lib/db/service-types";
import NewServiceForm from "../components/new-service-form";


export default async function NewServicePage() {
  const serviceTypes = await getServiceTypes();

  return (
    <main className="p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
            Services
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            New Laundry Service
          </h1>

          <p className="mt-2 text-neutral-500">
            Create a customer service with automatic
            payment tracking.
          </p>
        </div>

        <NewServiceForm serviceTypes={serviceTypes} />
      </div>
    </main>
  );
}