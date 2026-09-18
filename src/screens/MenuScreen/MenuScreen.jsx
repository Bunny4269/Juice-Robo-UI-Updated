import "./MenuScreen.css";

function clean(value) {
  return String(value ?? "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function productId(product = {}) {
  return firstDefined(
    product?.id,
    product?.productId,
    product?.product_id,
    product?.itemId,
    product?.item_id,
    product?.variantId,
    product?.variant_id
  );
}

function variantsOf(product = {}) {
  if (Array.isArray(product?.lstVariants)) return product.lstVariants;
  if (Array.isArray(product?.variants)) return product.variants;
  if (Array.isArray(product?.productVariants)) return product.productVariants;
  return [];
}

function variantId(product = {}) {
  const variants = variantsOf(product);
  const first = variants[0] || {};
  return firstDefined(
    product?.variantId,
    product?.variant_id,
    first?.variantId,
    first?.variant_id,
    first?.id,
    productId(product)
  );
}

function quantityForProduct(cart, product) {
  const ids = new Set(
    [
      productId(product),
      variantId(product),
      ...variantsOf(product).flatMap((item) => [
        item?.id,
        item?.variantId,
        item?.variant_id,
      ]),
    ]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );

  return (Array.isArray(cart) ? cart : []).reduce((total, item) => {
    const itemIds = [
      item?.id,
      item?.itemId,
      item?.item_id,
      item?.productId,
      item?.product_id,
      item?.variantId,
      item?.variant_id,
      item?.productVariantId,
      item?.product_variant_id,
      item?.itemVariantId,
      item?.item_variant_id,
      item?.variant?.id,
      item?.variant?.variantId,
    ]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String);

    if (!itemIds.some((id) => ids.has(id))) return total;

    return total + Math.max(
      0,
      Math.floor(
        number(
          firstDefined(
            item?.quantity,
            item?.qty,
            item?.count,
            item?.itemQuantity,
            item?.item_quantity
          ),
          0
        )
      )
    );
  }, 0);
}

function productName(product, displayProductName) {
  if (typeof displayProductName === "function") {
    const value = clean(displayProductName(product));
    if (value) return value;
  }

  return clean(
    firstDefined(
      product?.displayName,
      product?.name,
      product?.itemName,
      product?.productName,
      product?.product_name,
      product?.title
    )
  ) || "Juice";
}

function productDescription(product, displayDescription) {
  if (typeof displayDescription === "function") {
    const value = clean(displayDescription(product));
    if (value) return value;
  }

  return clean(
    firstDefined(
      product?.description,
      product?.shortDescription,
      product?.short_description,
      product?.itemDescription
    )
  );
}

function productPrice(product) {
  const variants = variantsOf(product);
  const first = variants[0] || {};

  return number(
    firstDefined(
      first?.sellingPrice,
      first?.selling_price,
      first?.price,
      product?.sellingPrice,
      product?.selling_price,
      product?.price,
      product?.unitPrice,
      product?.unit_price
    ),
    0
  );
}

function imageCandidates(product, productImage) {
  const values = [];

  if (typeof productImage === "function") {
    try {
      values.push(productImage(product));
    } catch {
      // Ignore image resolver errors.
    }
  }

  values.push(
    product?.imageUrl,
    product?.image_url,
    product?.image,
    product?.imagePath,
    product?.image_path,
    product?.productImage,
    product?.product_image,
    product?.thumbnail
  );

  return [...new Set(
    values
      .map((value) => clean(value))
      .filter(Boolean)
  )];
}

function locationName(location) {
  return clean(
    firstDefined(
      location?.outletName,
      location?.locationName,
      location?.storeName,
      location?.name,
      location?.outlet?.name,
      location?.location?.name,
      location?.store?.name
    )
  ) || "Choose location";
}

function locationAddress(location) {
  return clean(
    firstDefined(
      location?.address,
      location?.locationAddress,
      location?.storeAddress,
      location?.location
    )
  );
}

function machineName(machine) {
  return clean(
    firstDefined(
      machine?.machineName,
      machine?.machine_name,
      machine?.name,
      machine?.machineCode,
      machine?.machine_code,
      machine?.code
    )
  ) || "Choose machine";
}

function machineStatus(machine) {
  return clean(
    firstDefined(
      machine?.status,
      machine?.machineStatus,
      machine?.machine_status,
      machine?.availability
    )
  );
}

function resolveSchedule(source = {}) {
  const schedule =
    source?.schedule ??
    source?.timing ??
    source?.operatingHours ??
    source?.availability ??
    null;

  const startTime =
    schedule?.startTime ??
    schedule?.start_time ??
    source?.startTime ??
    source?.start_time ??
    null;

  const endTime =
    schedule?.endTime ??
    schedule?.end_time ??
    source?.endTime ??
    source?.end_time ??
    null;

  return { schedule, startTime, endTime };
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10.2c0 5.2-8 10.8-8 10.8S4 15.4 4 10.2a8 8 0 1 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function MenuScreen({
  products = [],
  selectedLocation,
  selectedMachine,
  cart = [],
  onProduct,
  onUpdate,
  onAddToCart,
  onViewCart,
  productImage,
  displayProductName,
  displayDescription,
  money,
}) {
  const safeProducts = Array.isArray(products) ? products : [];
  const location = locationName(selectedLocation);
  const address = locationAddress(selectedLocation);
  const machine = machineName(selectedMachine);
  const status = machineStatus(selectedMachine);
  const { startTime: locationStartTime, endTime: locationEndTime } = resolveSchedule(selectedLocation);
  const { startTime: machineStartTime, endTime: machineEndTime } = resolveSchedule(selectedMachine);

  // Diagnostic log verifying that all potential schedule sources and start times are null-safe
  if (typeof window !== "undefined" && !window.__jr_startTimeLogged) {
    window.__jr_startTimeLogged = true;
    console.log("[Juice Robo] START TIME SOURCE:", {
      selectedLocation,
      selectedLocationSchedule: resolveSchedule(selectedLocation),
      selectedMachine,
      selectedMachineSchedule: resolveSchedule(selectedMachine),
      productsCount: safeProducts.length,
      productsSchedule: safeProducts.map((p) => ({
        id: productId(p),
        name: productName(p, displayProductName),
        ...resolveSchedule(p),
      })),
    });
  }

  const totalCartCount = (Array.isArray(cart) ? cart : []).reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        Math.floor(
          Number(
            item?.quantity ?? item?.qty ?? item?.count ?? 1
          )
        )
      ),
    0
  );

  const totalCartAmount = (Array.isArray(cart) ? cart : []).reduce(
    (sum, item) => {
      const price = Number(
        item?.price ??
        item?.unitPrice ??
        item?.unit_price ??
        item?.sellingPrice ??
        item?.selling_price ??
        0
      );
      const qty = Math.max(
        1,
        Math.floor(
          Number(
            item?.quantity ?? item?.qty ?? item?.count ?? 1
          )
        )
      );
      return sum + price * qty;
    },
    0
  );

  return (
    <main className="jr-content jr-page jr-menu-page">
      <section className="jr-menu-hero">
        <div className="jr-menu-hero-copy">
          <div className="jr-menu-hero-tags">
            <span className="jr-menu-eyebrow">🌱 100% PURE SUGARCANE</span>
            <span className="jr-menu-tag-pill">⚡ Crushed Fresh Live</span>
          </div>
          <h1>
            Fresh Cold-Pressed,
            <br />
            <em>made right here.</em>
          </h1>
          <p>
            Pure natural sugarcane • Zero added water • Contactless robot dispensing.
          </p>
        </div>
      </section>

      <div className="jr-menu-outlet-chip">
        <span className="jr-menu-outlet-dot" />
        <span className="jr-menu-outlet-name">
          Dispensing at <strong>{location}</strong>
        </span>
        {status && <span className="jr-menu-outlet-status">● {status}</span>}
      </div>

      <section className="jr-menu-products-section">
        <div className="jr-menu-section-head">
          <div>
            <span className="jr-menu-section-eyebrow">AVAILABLE JUICES</span>
            <h2>What are you craving?</h2>
          </div>
          <span className="jr-menu-count">{safeProducts.length}</span>
        </div>

        <p className="jr-menu-subtitle">Choose your favourite fresh juice.</p>

        {safeProducts.length === 0 ? (
          <div className="jr-menu-empty">
            <div className="jr-menu-empty-icon">J</div>
            <strong>No juices available</strong>
            <p>No available products were returned by the Juice Robo API.</p>
          </div>
        ) : (
          <div className="jr-menu-grid">
            {safeProducts.map((product, index) => {
              const { schedule, startTime, endTime } = resolveSchedule(product);
              const name = productName(product, displayProductName);
              const description = productDescription(product, displayDescription);
              const price = productPrice(product);
              const quantity = quantityForProduct(cart, product);
              const images = imageCandidates(product, productImage);
              const id = variantId(product);

              const add = (event) => {
                event.stopPropagation();
                if (typeof onAddToCart === "function") {
                  onAddToCart(product, variantsOf(product)[0], 1);
                }
              };

              const decrease = (event) => {
                event.stopPropagation();
                if (typeof onUpdate !== "function" || id === undefined || id === null) return;
                onUpdate(id, Math.max(0, quantity - 1));
              };

              const increase = (event) => {
                event.stopPropagation();
                if (quantity === 0) {
                  if (typeof onAddToCart === "function") {
                    onAddToCart(product, variantsOf(product)[0], 1);
                  }
                  return;
                }
                if (typeof onUpdate !== "function" || id === undefined || id === null) return;
                onUpdate(id, quantity + 1);
              };

              return (
                <article
                  className={`jr-menu-product ${quantity > 0 ? "in-cart" : ""}`}
                  key={productId(product) ?? `product-${index}`}
                  onClick={() => onProduct?.(product)}
                >
                  <div className="jr-menu-product-media">
                    {images.length ? (
                      <img
                        src={images[0]}
                        alt={name}
                        className="jr-menu-product-image"
                        onError={(event) => {
                          const current = Number(event.currentTarget.dataset.imageIndex || 0);
                          const next = current + 1;
                          event.currentTarget.dataset.imageIndex = String(next);
                          if (images[next]) event.currentTarget.src = images[next];
                          else event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="jr-menu-product-placeholder" aria-hidden="true">J</div>
                    )}
                    <span className="jr-menu-fresh-badge">
                      <i /> FRESH
                    </span>
                  </div>

                  <div className="jr-menu-product-body">
                    <div className="jr-menu-product-top">
                      <div>
                        <h3>{name}</h3>
                        {description && <p>{description}</p>}
                      </div>
                      <strong>
                        {typeof money === "function" ? money(price) : `₹${price}`}
                      </strong>
                    </div>

                    {quantity === 0 ? (
                      <button type="button" className="jr-menu-add" onClick={add}>
                        <span>Add to cart</span>
                        <PlusIcon />
                      </button>
                    ) : (
                      <div className="jr-menu-quantity" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={decrease} aria-label={`Decrease ${name}`}>
                          <MinusIcon />
                        </button>
                        <strong>{quantity}</strong>
                        <button type="button" onClick={increase} aria-label={`Increase ${name}`}>
                          <PlusIcon />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {totalCartCount > 0 && (
        <aside
          className="jr-menu-floating-bar"
          onClick={() => {
            if (typeof onViewCart === "function") onViewCart();
          }}
          role="button"
          tabIndex={0}
          aria-label="View Cart"
        >
          <div className="jr-menu-floating-info">
            <span className="jr-menu-floating-badge">
              🛒 {totalCartCount} {totalCartCount === 1 ? "Item" : "Items"}
            </span>
            <span className="jr-menu-floating-sep">•</span>
            <strong className="jr-menu-floating-price">
              {typeof money === "function"
                ? money(totalCartAmount)
                : `₹${totalCartAmount.toFixed(2)}`}
            </strong>
          </div>

          <button
            type="button"
            className="jr-menu-floating-cta"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onViewCart === "function") onViewCart();
            }}
          >
            <span>VIEW CART</span>
            <span className="jr-menu-floating-arrow" aria-hidden="true">→</span>
          </button>
        </aside>
      )}
    </main>
  );
}
