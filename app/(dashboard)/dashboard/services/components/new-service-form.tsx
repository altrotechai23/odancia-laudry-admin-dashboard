"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Mail,
  Package,
  Phone,
  Search,
  Truck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import Link from "next/link";

import {
  createService,
  type CreateServiceState,
} from "@/actions/services/create-service";

import {
  searchClients,
  type ClientSearchResult,
} from "@/actions/clients/search-clients";


type ServiceType = {
  id: string;
  name: string;
  description: string | null;
};


type NewServiceFormProps = {
  serviceTypes: ServiceType[];
};


const initialState: CreateServiceState = {
  success: false,
  message: "",
};


const inputClassName =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/5";


const labelClassName =
  "mb-2 block text-sm font-medium text-neutral-700";


export default function NewServiceForm({
  serviceTypes,
}: NewServiceFormProps) {
  const router = useRouter();

  const [state, formAction, isPending] =
    useActionState(
      createService,
      initialState,
    );


  /*
   * ----------------------------------------------------------
   * CUSTOMER STATE
   * ----------------------------------------------------------
   */

  const [clientId, setClientId] =
    useState("");

  const [clientName, setClientName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [clientSearch, setClientSearch] =
    useState("");

  const [clientResults, setClientResults] =
    useState<ClientSearchResult[]>([]);

  const [isSearchingClients, setIsSearchingClients] =
    useState(false);

  const [showClientResults, setShowClientResults] =
    useState(false);

  const [isNewClient, setIsNewClient] =
    useState(false);


  const clientSearchTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );


  /*
   * ----------------------------------------------------------
   * SERVICE STATE
   * ----------------------------------------------------------
   */

  const [serviceTypeId, setServiceTypeId] =
    useState(
      serviceTypes[0]?.id ?? "",
    );

  const [totalPrice, setTotalPrice] =
    useState("");

  const [deposit, setDeposit] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("cash");

  const [serviceDate, setServiceDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0],
    );

  const [serviceTime, setServiceTime] =
    useState(
      new Date()
        .toTimeString()
        .slice(0, 5),
    );

  const [collectionDate, setCollectionDate] =
    useState("");

  const [numberOfItems, setNumberOfItems] =
    useState("");

  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<
      "customer_pickup" | "delivery"
    >("customer_pickup");

  const [notes, setNotes] =
    useState("");

  const [showPayment, setShowPayment] =
    useState(false);

  const [showOptional, setShowOptional] =
    useState(false);


  /*
   * ----------------------------------------------------------
   * PAYMENT CALCULATIONS
   * ----------------------------------------------------------
   */

  const price = Number(totalPrice) || 0;

  const depositAmount =
    Number(deposit) || 0;


  const balance = useMemo(
    () =>
      Math.max(
        price - depositAmount,
        0,
      ),
    [
      price,
      depositAmount,
    ],
  );


  const paymentStatus = useMemo(() => {
    if (depositAmount <= 0) {
      return "No payment";
    }

    if (
      depositAmount >= price &&
      price > 0
    ) {
      return "Paid";
    }

    return "Deposit";
  }, [
    depositAmount,
    price,
  ]);


  /*
   * ----------------------------------------------------------
   * CUSTOMER SEARCH
   * ----------------------------------------------------------
   */

  useEffect(() => {
  if (isNewClient) {
    return;
  }

  const query = clientSearch.trim();

  if (query.length < 2) {
    return;
  }

  if (clientSearchTimer.current) {
    clearTimeout(clientSearchTimer.current);
  }

  clientSearchTimer.current = setTimeout(
    async () => {
      setIsSearchingClients(true);

      try {
        const results =
          await searchClients(query);

        setClientResults(results);
      } catch (error) {
        console.error(
          "Unable to search clients:",
          error,
        );

        setClientResults([]);
      } finally {
        setIsSearchingClients(false);
      }
    },
    300,
  );

  return () => {
    if (clientSearchTimer.current) {
      clearTimeout(
        clientSearchTimer.current,
      );
    }
  };
}, [
  clientSearch,
  isNewClient,
]);


  /*
   * ----------------------------------------------------------
   * SELECT EXISTING CUSTOMER
   * ----------------------------------------------------------
   */

  function handleSelectClient(
    client: ClientSearchResult,
  ) {
    setClientId(client.id);

    setClientName(
      client.full_name,
    );

    setPhone(client.phone);

    setEmail(
      client.email ?? "",
    );

    setClientSearch(
      client.full_name,
    );

    setClientResults([]);

    setShowClientResults(false);

    setIsNewClient(false);
  }


  /*
   * ----------------------------------------------------------
   * SWITCH TO NEW CUSTOMER
   * ----------------------------------------------------------
   */

  function handleCreateNewClient() {
    setClientId("");

    setClientName("");

    setPhone("");

    setEmail("");

    setClientSearch("");

    setClientResults([]);

    setShowClientResults(false);

    setIsNewClient(true);
  }


  /*
   * ----------------------------------------------------------
   * RESET CUSTOMER
   * ----------------------------------------------------------
   */

  function handleChangeClient() {
    setClientId("");

    setClientName("");

    setPhone("");

    setEmail("");

    setClientSearch("");

    setClientResults([]);

    setShowClientResults(true);

    setIsNewClient(false);
  }


  /*
   * ----------------------------------------------------------
   * SUCCESS
   * ----------------------------------------------------------
   */

  if (state.success) {
    return (
      <motion.div
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="flex min-h-[420px] items-center justify-center"
      >
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <Check
              className="h-8 w-8 text-emerald-600"
              strokeWidth={2.5}
            />
          </div>

          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-950">
            Service created
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            The laundry service and payment
            information have been recorded
            successfully.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/services",
              )
            }
            className="mt-7 h-12 w-full rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99]"
          >
            Back to services
          </button>
        </div>
      </motion.div>
    );
  }


  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {/* =====================================================
          ERROR
      ====================================================== */}

      <AnimatePresence>
        {state.message &&
          !state.success && (
            <motion.div
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -8,
              }}
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <X className="mt-0.5 h-5 w-5 shrink-0" />

              <span>
                {state.message}
              </span>
            </motion.div>
          )}
      </AnimatePresence>
    
      

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/services"
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />

          Back
        </Link>

        <div className="hidden text-right sm:block">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
            New service
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            All prices in South African rand
          </p>
        </div>
      </div>


      {/* =====================================================
          CUSTOMER
      ====================================================== */}

      <section className="overflow-visible rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-neutral-950">
                Customer
              </h2>

              <p className="text-sm text-neutral-500">
                Find an existing customer or add a new one.
              </p>
            </div>
          </div>
        </div>


        <div className="p-5 sm:p-7">
          {!isNewClient &&
          !clientId ? (
            <div className="relative">
              <label
                htmlFor="clientSearch"
                className={labelClassName}
              >
                Search customer
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                <input
                  id="clientSearch"
                  type="search"
                  value={clientSearch}
                  onChange={(event) => {
  const value =
    event.target.value;

  setClientSearch(value);

  if (value.trim().length < 2) {
    setClientResults([]);
    setShowClientResults(false);
    setIsSearchingClients(false);
    return;
  }

  setShowClientResults(true);
}}
                  onFocus={() => {
  if (
    clientSearch.trim().length >= 2
  ) {
    setShowClientResults(true);
  }
}}
                  placeholder="Search by name or phone number..."
                  className={`${inputClassName} pl-11`}
                  autoComplete="off"
                />
              </div>


              <AnimatePresence>
                {showClientResults && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -5,
                    }}
                    className="absolute left-5 right-5 z-30 mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl sm:left-7 sm:right-7"
                  >
                    {isSearchingClients ? (
                      <div className="flex items-center gap-3 p-5 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin" />

                        Searching customers...
                      </div>
                    ) : clientResults.length > 0 ? (
                      <div>
                        {clientResults.map(
                          (client) => (
                            <button
                              type="button"
                              key={client.id}
                              onClick={() =>
                                handleSelectClient(
                                  client,
                                )
                              }
                              className="flex w-full items-center gap-4 border-b border-neutral-100 p-4 text-left transition hover:bg-neutral-50 last:border-b-0"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                                <UserRound className="h-4 w-4 text-neutral-600" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-neutral-950">
                                  {
                                    client.full_name
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />

                                    {
                                      client.phone
                                    }
                                  </span>

                                  {client.email && (
                                    <span className="flex items-center gap-1 truncate">
                                      <Mail className="h-3 w-3" />

                                      {
                                        client.email
                                      }
                                    </span>
                                  )}
                                </div>
                              </div>

                              <ChevronDown className="h-4 w-4 -rotate-90 text-neutral-300" />
                            </button>
                          ),
                        )}
                      </div>
                    ) : clientSearch.trim().length >=
                      2 ? (
                      <div className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                            <Search className="h-4 w-4 text-neutral-500" />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-neutral-950">
                              No customer found
                            </p>

                            <p className="mt-1 text-xs text-neutral-500">
                              You can create a new customer below.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}


                    <button
                      type="button"
                      onClick={
                        handleCreateNewClient
                      }
                      className="flex w-full items-center gap-3 border-t border-neutral-100 bg-neutral-50 p-4 text-left text-sm font-medium text-neutral-950 transition hover:bg-neutral-100"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
                        +
                      </span>

                      Add new customer
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : clientId ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-neutral-950">
                      {clientName}
                    </p>

                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Existing
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />

                      {phone}
                    </span>

                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />

                        {email}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    handleChangeClient
                  }
                  className="shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-950"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    New customer
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Enter their details below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleChangeClient
                  }
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-400"
                >
                  Search existing
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="clientName"
                    className={labelClassName}
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <input
                      id="clientName"
                      name="clientName"
                      value={clientName}
                      onChange={(event) =>
                        setClientName(
                          event.target.value,
                        )
                      }
                      placeholder="e.g. Thabo Mokoena"
                      className={`${inputClassName} pl-11`}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>


                <div>
                  <label
                    htmlFor="phone"
                    className={labelClassName}
                  >
                    Cell phone
                  </label>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value,
                        )
                      }
                      placeholder="+27 71 234 5678"
                      className={`${inputClassName} pl-11`}
                      autoComplete="tel"
                      required
                    />
                  </div>
                </div>


                <div className="sm:col-span-2">
                  <label
                    htmlFor="email"
                    className={labelClassName}
                  >
                    Email
                    <span className="ml-2 text-xs font-normal text-neutral-400">
                      optional
                    </span>
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value,
                        )
                      }
                      placeholder="customer@example.com"
                      className={`${inputClassName} pl-11`}
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Hidden existing client ID */}

        {clientId && (
          <input
            type="hidden"
            name="clientId"
            value={clientId}
          />
        )}


        {/* Hidden customer values for existing clients */}

        {clientId && (
          <>
            <input
              type="hidden"
              name="clientName"
              value={clientName}
            />

            <input
              type="hidden"
              name="phone"
              value={phone}
            />

            <input
              type="hidden"
              name="email"
              value={email}
            />
          </>
        )}
      </section>


      {/* =====================================================
          SERVICE
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950">
              <Package className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-neutral-950">
                Laundry service
              </h2>

              <p className="text-sm text-neutral-500">
                Choose the service and agree on a price.
              </p>
            </div>
          </div>
        </div>


        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <div className="sm:col-span-2">
            <label
              htmlFor="serviceTypeId"
              className={labelClassName}
            >
              Service type
            </label>

            <div className="relative">
              <select
                id="serviceTypeId"
                name="serviceTypeId"
                value={serviceTypeId}
                onChange={(event) =>
                  setServiceTypeId(
                    event.target.value,
                  )
                }
                className={`${inputClassName} appearance-none pr-11`}
                required
              >
                <option value="">
                  Select service
                </option>

                {serviceTypes.map(
                  (serviceType) => (
                    <option
                      key={serviceType.id}
                      value={serviceType.id}
                    >
                      {serviceType.name}
                    </option>
                  ),
                )}
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>


          <div>
            <label
              htmlFor="totalPrice"
              className={labelClassName}
            >
              Agreed price
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500">
                R
              </span>

              <input
                id="totalPrice"
                name="totalPrice"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={totalPrice}
                onChange={(event) =>
                  setTotalPrice(
                    event.target.value,
                  )
                }
                placeholder="0.00"
                className={`${inputClassName} pl-9 text-base font-semibold`}
                required
              />
            </div>

            <p className="mt-2 text-xs text-neutral-400">
              Enter the negotiated customer price.
            </p>
          </div>


          <div>
            <label
              htmlFor="numberOfItems"
              className={labelClassName}
            >
              Number of items
              <span className="ml-2 text-xs font-normal text-neutral-400">
                optional
              </span>
            </label>

            <div className="relative">
              <Package className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                id="numberOfItems"
                name="numberOfItems"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={numberOfItems}
                onChange={(event) =>
                  setNumberOfItems(
                    event.target.value,
                  )
                }
                placeholder="e.g. 12"
                className={`${inputClassName} pl-11`}
              />
            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          DATES
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-neutral-950">
                Schedule
              </h2>

              <p className="text-sm text-neutral-500">
                When the service is received and collected.
              </p>
            </div>
          </div>
        </div>


        <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-7">
          <div>
            <label
              htmlFor="serviceDate"
              className={labelClassName}
            >
              Service date
            </label>

            <input
              id="serviceDate"
              name="serviceDate"
              type="date"
              value={serviceDate}
              onChange={(event) =>
                setServiceDate(
                  event.target.value,
                )
              }
              className={inputClassName}
              required
            />
          </div>


          <div>
            <label
              htmlFor="serviceTime"
              className={labelClassName}
            >
              Time
            </label>

            <div className="relative">
              <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                id="serviceTime"
                name="serviceTime"
                type="time"
                value={serviceTime}
                onChange={(event) =>
                  setServiceTime(
                    event.target.value,
                  )
                }
                className={`${inputClassName} pl-11`}
                required
              />
            </div>
          </div>


          <div>
            <label
              htmlFor="collectionDate"
              className={labelClassName}
            >
              Collection date
            </label>

            <input
              id="collectionDate"
              name="collectionDate"
              type="date"
              value={collectionDate}
              onChange={(event) =>
                setCollectionDate(
                  event.target.value,
                )
              }
              className={inputClassName}
              required
            />
          </div>
        </div>
      </section>


      {/* =====================================================
          FULFILLMENT
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-7">
          <div>
            <h2 className="font-semibold text-neutral-950">
              Fulfillment
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              How will the customer receive their laundry?
            </p>
          </div>
        </div>


        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
          <button
            type="button"
            onClick={() =>
              setFulfillmentMethod(
                "customer_pickup",
              )
            }
            className={`group rounded-2xl border p-5 text-left transition ${
              fulfillmentMethod ===
              "customer_pickup"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white hover:border-neutral-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  fulfillmentMethod ===
                  "customer_pickup"
                    ? "bg-white/10"
                    : "bg-neutral-100"
                }`}
              >
                <Package className="h-5 w-5" />
              </div>

              {fulfillmentMethod ===
                "customer_pickup" && (
                <Check className="h-5 w-5" />
              )}
            </div>

            <p className="mt-5 font-medium">
              Customer pickup
            </p>

            <p
              className={`mt-1 text-sm ${
                fulfillmentMethod ===
                "customer_pickup"
                  ? "text-white/60"
                  : "text-neutral-500"
              }`}
            >
              Customer collects from the laundry.
            </p>
          </button>


          <button
            type="button"
            onClick={() =>
              setFulfillmentMethod(
                "delivery",
              )
            }
            className={`group rounded-2xl border p-5 text-left transition ${
              fulfillmentMethod ===
              "delivery"
                ? "border-neutral-950 bg-neutral-950 text-white"
                : "border-neutral-200 bg-white hover:border-neutral-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  fulfillmentMethod ===
                  "delivery"
                    ? "bg-white/10"
                    : "bg-neutral-100"
                }`}
              >
                <Truck className="h-5 w-5" />
              </div>

              {fulfillmentMethod ===
                "delivery" && (
                <Check className="h-5 w-5" />
              )}
            </div>

            <p className="mt-5 font-medium">
              Delivery
            </p>

            <p
              className={`mt-1 text-sm ${
                fulfillmentMethod ===
                "delivery"
                  ? "text-white/60"
                  : "text-neutral-500"
              }`}
            >
              Laundry will be delivered to the customer.
            </p>
          </button>
        </div>


        <input
          type="hidden"
          name="fulfillmentMethod"
          value={fulfillmentMethod}
        />
      </section>


      {/* =====================================================
          PAYMENT
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() =>
            setShowPayment(
              (value) => !value,
            )
          }
          className="flex w-full items-center justify-between px-5 py-5 text-left sm:px-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-neutral-950">
                Payment
              </h2>

              <p className="text-sm text-neutral-500">
                Record a deposit or payment.
              </p>
            </div>
          </div>

          <motion.div
            animate={{
              rotate: showPayment ? 180 : 0,
            }}
          >
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          </motion.div>
        </button>


        <AnimatePresence initial={false}>
          {showPayment && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              className="overflow-hidden"
            >
              <div className="border-t border-neutral-100 p-5 sm:p-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="deposit"
                      className={labelClassName}
                    >
                      Amount paid now
                    </label>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500">
                        R
                      </span>

                      <input
                        id="deposit"
                        name="deposit"
                        type="number"
                        min="0"
                        max={
                          price > 0
                            ? price
                            : undefined
                        }
                        step="0.01"
                        inputMode="decimal"
                        value={deposit}
                        onChange={(event) =>
                          setDeposit(
                            event.target.value,
                          )
                        }
                        placeholder="0.00"
                        className={`${inputClassName} pl-9`}
                      />
                    </div>
                  </div>


                  <div>
  <label
    htmlFor="paymentMethod"
    className={labelClassName}
  >
    Payment method
  </label>

  <div className="relative">
    <select
      id="paymentMethod"
      name="paymentMethod"
      value={paymentMethod}
      onChange={(event) =>
        setPaymentMethod(event.target.value)
      }
      className={`${inputClassName} appearance-none pr-11`}
    >
      <option value="cash">
        Cash
      </option>

      <option value="card">
        Card
      </option>

      <option value="eft">
        EFT
      </option>

      <option value="other">
        Other
      </option>
    </select>

    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
  </div>
</div>
                </div>


                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs text-neutral-500">
                      Total
                    </p>

                    <p className="mt-1 text-lg font-semibold text-neutral-950">
                      R{" "}
                      {price.toFixed(2)}
                    </p>
                  </div>


                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs text-neutral-500">
                      Paid now
                    </p>

                    <p className="mt-1 text-lg font-semibold text-neutral-950">
                      R{" "}
                      {depositAmount.toFixed(2)}
                    </p>
                  </div>


                  <div className="rounded-2xl bg-neutral-950 p-4 text-white">
                    <p className="text-xs text-white/60">
                      Balance
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      R{" "}
                      {balance.toFixed(2)}
                    </p>
                  </div>
                </div>


                <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                  <Banknote className="h-4 w-4" />

                  Payment status:

                  <span className="font-medium text-neutral-950">
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {/* Always submit payment defaults even when Payment is collapsed */}
        {!showPayment && (
        <>
            <input
            type="hidden"
            name="deposit"
            value={deposit || "0"}
            />

            <input
            type="hidden"
            name="paymentMethod"
            value={paymentMethod}
            />
        </>
        )}


      {/* =====================================================
          ADDITIONAL DETAILS
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() =>
            setShowOptional(
              (value) => !value,
            )
          }
          className="flex w-full items-center justify-between px-5 py-5 text-left sm:px-7"
        >
          <div>
            <h2 className="font-semibold text-neutral-950">
              Additional details
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Optional notes for this service.
            </p>
          </div>

          <motion.div
            animate={{
              rotate: showOptional
                ? 180
                : 0,
            }}
          >
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          </motion.div>
        </button>


        <AnimatePresence initial={false}>
          {showOptional && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: "auto",
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              className="overflow-hidden"
            >
              <div className="border-t border-neutral-100 p-5 sm:p-7">
                <label
                  htmlFor="notes"
                  className={labelClassName}
                >
                  Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Special instructions, stains, customer requests..."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-950 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/5"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {!showOptional && (
        <input
            type="hidden"
            name="notes"
            value={notes}
        />
        )}


      {/* =====================================================
          SUBMIT
      ====================================================== */}

      <div className="sticky bottom-4 z-20">
        <div className="rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-xl shadow-neutral-950/5 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="px-2">
              <p className="text-xs text-neutral-500">
                Service total
              </p>

              <p className="text-lg font-semibold text-neutral-950">
                R{" "}
                {price.toFixed(2)}
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isPending ||
                !clientName ||
                !phone ||
                !serviceTypeId ||
                !totalPrice
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Creating service...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />

                  Create service
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}