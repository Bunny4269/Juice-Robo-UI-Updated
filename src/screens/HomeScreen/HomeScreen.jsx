import React from "react";
import "./HomeScreen.css";

/* =========================================================
   JUICE ROBO — HOME SCREEN
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function getFirstName(user, customer) {
  const name =
    user?.name ||
    user?.firstname ||
    customer?.name ||
    "Juice Lover";

  return clean(name).split(/\s+/)[0] || "Juice Lover";
}

function getLocationName(location) {
  return (
    clean(
      location?.name ||
        location?.storeName ||
        location?.locationName ||
        location?.outletName
    ) || "Select collection point"
  );
}

function getLocationAddress(location) {
  return (
    clean(
      location?.address ||
        location?.locAddress ||
        location?.storeAddress ||
        location?.location
    ) || "Choose a Juice Robo machine near you"
  );
}

function getMachineName(machine) {
  return (
    clean(
      machine?.name ||
        machine?.machineName ||
        machine?.machine_code ||
        machine?.machineCode
    ) || "Choose a machine"
  );
}

function getProductName(product) {
  return (
    clean(
      product?.displayName ||
        product?.name ||
        product?.productName ||
        product?.product_name ||
        product?.title
    ) || "Fresh Sugarcane Juice"
  );
}

function getProductPrice(product) {
  const value =
    product?.price ??
    product?.sellingPrice ??
    product?.selling_price ??
    product?.unitPrice ??
    product?.unit_price ??
    0;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }

  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}


/* =========================================================
   MAIN SCREEN
   ========================================================= */

export default function HomeScreen({
  user,
  customer,
  location,
  machine,
  products = [],
  cart = [],
  onMenu,
  onLocation,
  onOrders,
  onProfile,
  onProduct,
  money,
}) {
  const firstName =
    getFirstName(user, customer);

  const safeProducts =
    Array.isArray(products)
      ? products
      : [];

  const safeCart =
    Array.isArray(cart)
      ? cart
      : [];

  const cartCount =
    safeCart.reduce(
      (sum, item) =>
        sum +
        Number(
          item?.quantity ??
            item?.qty ??
            1
        ),
      0
    );

  const hasLocation =
    Boolean(location);

  const hasMachine =
    Boolean(machine);

  return (
    <main className="jr-content jr-page jr-home-page">

      {/* =================================================
          TOP BAR
         ================================================= */}

      <header className="jr-home-topbar">

        <button
          type="button"
          className="jr-home-location"
          onClick={onLocation}
        >

          <span className="jr-home-location-pin">
            📍
          </span>

          <span className="jr-home-location-copy">

            <small>
              COLLECT FROM
            </small>

            <strong>
              {getLocationName(location)}
            </strong>

          </span>

          <span className="jr-home-chevron">
            ▾
          </span>

        </button>


        <button
          type="button"
          className="jr-home-profile-button"
          onClick={onProfile}
          aria-label="Open profile"
        >
          {String(firstName[0] || "J").toUpperCase()}
        </button>

      </header>


      {/* =================================================
          HERO
         ================================================= */}

      <section className="jr-home-hero">

        <div className="jr-home-hero-copy">

          <span className="jr-home-eyebrow">
            FRESH. FAST. SIMPLE.
          </span>

          <h1>
            Your juice,
            <br />
            <em>your way.</em>
          </h1>

          <p>
            Freshly pressed sugarcane juice,
            made when you order.
          </p>

          <button
            type="button"
            className="jr-home-primary-button"
            onClick={onMenu}
          >
            <span>
              ORDER NOW
            </span>

            <strong>
              →
            </strong>
          </button>

        </div>


        <div
          className="jr-home-hero-art"
          aria-hidden="true"
        >
          <div className="jr-home-art-glow" />

          <div className="jr-home-glass">
            <div className="jr-home-glass-juice" />
            <div className="jr-home-glass-top" />
            <div className="jr-home-straw" />
          </div>

          <span className="jr-home-leaf jr-home-leaf-one">
            ✦
          </span>

          <span className="jr-home-leaf jr-home-leaf-two">
            ✦
          </span>
        </div>

      </section>


      {/* =================================================
          COLLECTION STATUS
         ================================================= */}

      <section className="jr-home-collection-card">

        <div className="jr-home-collection-icon">
          📍
        </div>

        <div className="jr-home-collection-copy">

          <span>
            COLLECTION POINT
          </span>

          <strong>
            {getLocationName(location)}
          </strong>

          <small>
            {hasLocation
              ? getLocationAddress(location)
              : "Select your collection location"}
          </small>

          {hasMachine && (
            <small>
              Machine: {getMachineName(machine)}
            </small>
          )}

        </div>

        <button
          type="button"
          onClick={onLocation}
          className="jr-home-change-button"
        >
          {hasLocation ? "CHANGE" : "SELECT"}
        </button>

      </section>


      {/* =================================================
          QUICK MENU
         ================================================= */}

      <section className="jr-home-menu-section">

        <div className="jr-home-section-heading">

          <div>
            <span>
              EXPLORE
            </span>

            <h2>
              What are you craving?
            </h2>
          </div>

          <button
            type="button"
            onClick={onMenu}
          >
            VIEW ALL →
          </button>

        </div>


        {safeProducts.length > 0 ? (

          <div className="jr-home-product-row">

            {safeProducts
              .slice(0, 3)
              .map((product, index) => (

                <button
                  type="button"
                  className="jr-home-product-card"
                  key={
                    product?.id ||
                    product?.productId ||
                    index
                  }
                  onClick={() =>
                    onProduct?.(product)
                  }
                >

                  <div className="jr-home-product-image">
                    <span>
                      🧃
                    </span>
                  </div>

                  <strong>
                    {getProductName(product)}
                  </strong>

                  <small>
                    {formatMoney(
                      getProductPrice(product),
                      money
                    )}
                  </small>

                </button>

              ))}

          </div>

        ) : (

          <button
            type="button"
            className="jr-home-empty-products"
            onClick={onMenu}
          >
            <span>
              🧃
            </span>

            <div>
              <strong>
                Fresh juices are waiting
              </strong>

              <small>
                Tap to browse the menu
              </small>
            </div>

            <b>
              →
            </b>
          </button>

        )}

      </section>


      {/* =================================================
          ORDER HISTORY / PROFILE SHORTCUTS
         ================================================= */}

      <section className="jr-home-shortcuts">

        <button
          type="button"
          onClick={onOrders}
        >
          <span className="jr-home-shortcut-icon">
            ▤
          </span>

          <span>
            <strong>
              Order history
            </strong>

            <small>
              View previous orders
            </small>
          </span>

          <b>
            →
          </b>
        </button>


        <button
          type="button"
          onClick={onProfile}
        >
          <span className="jr-home-shortcut-icon">
            ◯
          </span>

          <span>
            <strong>
              My account
            </strong>

            <small>
              Manage your profile
            </small>
          </span>

          <b>
            →
          </b>
        </button>

      </section>


      {/* =================================================
          CART FLOATING BAR
         ================================================= */}

      {cartCount > 0 && (
        <button
          type="button"
          className="jr-home-cart-bar"
          onClick={onMenu}
        >

          <span className="jr-home-cart-count">
            {cartCount}
          </span>

          <span>
            <strong>
              {cartCount === 1
                ? "1 item in your cart"
                : `${cartCount} items in your cart`}
            </strong>

            <small>
              Tap to continue ordering
            </small>
          </span>

          <b>
            →
          </b>

        </button>
      )}


      {/* =================================================
          FOOTER
         ================================================= */}

      <p className="jr-home-footer">
        Juice Robo · Fresh juice, simple ordering.
      </p>

    </main>
  );
}
