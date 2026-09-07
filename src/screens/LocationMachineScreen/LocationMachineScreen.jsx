import "./LocationMachineScreen.css";

/* =========================================================
   JUICE ROBO — LOCATION + MACHINE SCREEN
   ========================================================= */

function getLocationId(location = {}) {
  return String(
    location?.storeId ??
      location?.store_id ??
      location?.locId ??
      location?.id ??
      location?.locationId ??
      location?.location_id ??
      ""
  );
}

function getMachineId(machine = {}) {
  return String(
    machine?.id ??
      machine?.machineId ??
      machine?.machine_id ??
      machine?.storeId ??
      machine?.store_id ??
      ""
  );
}

function getLocationName(location = {}) {
  return (
    location?.name ||
    location?.storeName ||
    location?.outletName ||
    location?.locationName ||
    "Juice Robo"
  );
}

function getLocationAddress(location = {}) {
  return (
    location?.address ||
    location?.locAddress ||
    location?.storeAddress ||
    location?.location ||
    location?.description ||
    "Collection point"
  );
}

function getMachineName(machine = {}) {
  return (
    machine?.name ||
    machine?.machineName ||
    machine?.machine_name ||
    machine?.machineCode ||
    machine?.machine_code ||
    "Juice Robo Machine"
  );
}

function getMachineStatus(machine = {}) {
  return (
    machine?.status ||
    machine?.machineStatus ||
    machine?.machine_status ||
    "ONLINE"
  );
}

/* =========================================================
   LOCATION ICON
   ========================================================= */

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="jr-location-pin-svg"
      aria-hidden="true"
    >
      <path
        d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"
        fill="#f8f9f2"
        stroke="#e7e7df"
        strokeWidth="1.2"
      />

      <circle
        cx="12"
        cy="9"
        r="3"
        fill="#ee3e73"
      />
    </svg>
  );
}

/* =========================================================
   MACHINE ICON
   ========================================================= */

function MachineIcon() {
  return (
    <svg
      viewBox="0 0 42 42"
      className="jr-machine-svg"
      aria-hidden="true"
    >
      <rect
        x="10"
        y="7"
        width="22"
        height="28"
        rx="3"
        fill="#f4f7ec"
        stroke="#dfe6d8"
        strokeWidth="1"
      />

      <rect
        x="14"
        y="12"
        width="14"
        height="11"
        rx="2"
        fill="#fff"
        stroke="#e4e6df"
      />

      <rect
        x="17"
        y="14"
        width="8"
        height="6"
        rx="1"
        fill="#ef7a00"
      />

      <circle
        cx="21"
        cy="17"
        r="1.5"
        fill="#43a45c"
      />

      <rect
        x="16"
        y="27"
        width="10"
        height="3"
        rx="1.5"
        fill="#48a65c"
      />

      <path
        d="M14 7 17 3h8l3 4"
        fill="#51a95e"
      />

      <circle
        cx="29"
        cy="10"
        r="2"
        fill="#f07800"
      />
    </svg>
  );
}

/* =========================================================
   CHECK ICON
   ========================================================= */

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="jr-check-svg"
      aria-hidden="true"
    >
      <path
        d="m3.2 8.1 3 3.1 6.6-6.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   MAIN SCREEN
   ========================================================= */

export default function LocationMachineScreen({
  locations = [],
  machines = [],
  selectedLocationId = "",
  selectedMachineId = "",
  onLocation,
  onMachine,
  onContinue,
}) {
  const safeLocations = Array.isArray(locations)
    ? locations
    : [];

  const safeMachines = Array.isArray(machines)
    ? machines
    : [];

  /* =======================================================
     FILTER MACHINES BY LOCATION
     ======================================================= */

  const visibleMachines = selectedLocationId
    ? safeMachines.filter((machine) => {
        const machineLocation = String(
          machine?.locationId ??
            machine?.location_id ??
            machine?.storeId ??
            machine?.store_id ??
            ""
        );

        /*
         * If the API does not provide a location relation,
         * keep the machine visible.
         */
        return (
          !machineLocation ||
          machineLocation ===
            String(selectedLocationId)
        );
      })
    : safeMachines;

  const canContinue =
    Boolean(selectedLocationId) &&
    Boolean(selectedMachineId);

  return (
    <main className="jr-content jr-page jr-location-page jr-location-machine-screen">

      {/* =====================================================
          PAGE INTRO
         ===================================================== */}

      <header className="jr-location-header">

        <span className="jr-location-eyebrow">
          COLLECTION POINT
        </span>

        <h1 className="jr-location-title">
          Collect juice from
        </h1>

        <p className="jr-location-description">
          First choose your Juice Robo location, then select
          <br className="jr-location-desktop-break" />
          the machine you&apos;d like to use.
        </p>

      </header>


      {/* =====================================================
          LOCATION
         ===================================================== */}

      <section className="jr-flow-section">

        <div className="jr-flow-heading">

          <span className="jr-flow-number">
            01
          </span>

          <div className="jr-flow-heading-copy">

            <strong>
              SELECT LOCATION
            </strong>

            <small>
              Where will you collect your juice?
            </small>

          </div>

        </div>


        <div className="jr-choice-list">

          {safeLocations.length === 0 ? (

            <div className="jr-location-empty">

              <strong>
                No collection locations available
              </strong>

              <p>
                Please try again after the Juice Robo
                outlet data loads.
              </p>

            </div>

          ) : (

            safeLocations.map(
              (location, index) => {

                const id =
                  getLocationId(location);

                const key =
                  id ||
                  `location-${index}`;

                const active =
                  String(id) ===
                  String(selectedLocationId);

                return (
                  <button
                    className={
                      active
                        ? "jr-choice active"
                        : "jr-choice"
                    }
                    key={key}
                    type="button"
                    onClick={() =>
                      onLocation?.(location)
                    }
                    aria-selected={active}
                  >

                    {/* ICON */}
                    <span className="jr-choice-icon">
                      <LocationIcon />
                    </span>


                    {/* CONTENT */}
                    <span className="jr-choice-copy">

                      <strong>
                        {getLocationName(
                          location
                        )}
                      </strong>

                      <small>
                        {getLocationAddress(
                          location
                        )}
                      </small>

                    </span>


                    {/* CHECK */}
                    <span
                      className="jr-choice-check"
                      aria-hidden="true"
                    >
                      {active && (
                        <CheckIcon />
                      )}
                    </span>

                  </button>
                );
              }
            )

          )}

        </div>

      </section>


      {/* =====================================================
          MACHINE
         ===================================================== */}

      <section className="jr-flow-section jr-machine-section">

        <div className="jr-flow-heading">

          <span className="jr-flow-number">
            02
          </span>

          <div className="jr-flow-heading-copy">

            <strong>
              SELECT MACHINE
            </strong>

            <small>
              Choose your Juice Robo machine.
            </small>

          </div>

        </div>


        <div className="jr-machine-list">

          {visibleMachines.length === 0 ? (

            <div className="jr-location-empty jr-machine-empty">

              <span
                className="jr-empty-machine-icon"
                aria-hidden="true"
              >
                <MachineIcon />
              </span>

              <strong>
                No machine available
              </strong>

              <p>
                Select a collection location to see
                its machine.
              </p>

            </div>

          ) : (

            visibleMachines.map(
              (machine, index) => {

                const id =
                  getMachineId(machine);

                const key =
                  id ||
                  `machine-${index}`;

                const active =
                  id ===
                  String(selectedMachineId);

                const status =
                  getMachineStatus(
                    machine
                  );

                return (
                  <button
                    className={
                      active
                        ? "jr-machine-card active"
                        : "jr-machine-card"
                    }
                    key={key}
                    type="button"
                    onClick={() =>
                      onMachine?.(machine)
                    }
                    aria-selected={active}
                  >

                    {/* MACHINE ICON */}
                    <span className="jr-machine-icon">
                      <MachineIcon />
                    </span>


                    {/* MACHINE CONTENT */}
                    <span className="jr-machine-copy">

                      <strong>
                        {getMachineName(
                          machine
                        )}
                      </strong>

                      <small>
                        {status}
                      </small>

                    </span>


                    {/* STATUS */}
                    <span
                      className={
                        active
                          ? "jr-machine-status selected"
                          : "jr-machine-status"
                      }
                    >

                      <i />

                      {active
                        ? "SELECTED"
                        : String(status).toUpperCase()}

                    </span>


                    {/* CHECK */}
                    <span
                      className="jr-machine-check"
                      aria-hidden="true"
                    >
                      {active && (
                        <CheckIcon />
                      )}
                    </span>

                  </button>
                );
              }
            )

          )}

        </div>

      </section>


      {/* =====================================================
          CONTINUE
         ===================================================== */}

      <button
        className="jr-location-continue"
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
      >

        <span>
          CONTINUE TO MENU
        </span>

        <span className="jr-continue-arrow">
          →
        </span>

      </button>

    </main>
  );
}