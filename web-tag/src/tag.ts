/**
 * MIMS Ad Manager - JavaScript Ad Tag
 *
 * Usage:
 *   MIMSAds.init({ serverUrl: 'http://localhost:8080' });
 *   MIMSAds.defineSlot('slot1', { width: 728, height: 90 });
 *   MIMSAds.setTargeting('section', 'news');
 *   MIMSAds.setTargeting('country', 'sg');
 *   MIMSAds.display();
 */

interface SlotConfig {
  width: number;
  height: number;
  elementId?: string;
  adUnit?: string;
}

interface AdResult {
  slot_id: string;
  impression_id: string;
  line_item_id: number;
  creative_id: number;
  width: number;
  height: number;
  image_url: string;
  click_url: string;
  tracking: {
    impression: string;
    viewable: string;
    click: string;
  };
}

interface Config {
  serverUrl: string;
  userId?: string;
  platform?: string;
  country?: string;
}

// Generate unique user ID
function generateUserId(): string {
  const stored = localStorage.getItem('mims_user_id');
  if (stored) return stored;

  const id = 'u_' + Math.random().toString(36).substring(2, 15) +
             Math.random().toString(36).substring(2, 15);
  localStorage.setItem('mims_user_id', id);
  return id;
}

// Main MIMSAds object
const MIMSAds = (function() {
  let config: Config = {
    serverUrl: '',
    userId: '',
    platform: 'web',
    country: '',
  };

  const slots: Map<string, SlotConfig> = new Map();
  const targeting: Map<string, string> = new Map();
  const displayedAds: Map<string, AdResult> = new Map();
  const viewabilityObservers: Map<string, IntersectionObserver> = new Map();

  /**
   * Initialize the ad tag
   */
  function init(options: Partial<Config>): void {
    config = {
      ...config,
      ...options,
      userId: options.userId || generateUserId(),
    };

    // Auto-detect country if not provided
    if (!config.country) {
      detectCountry();
    }
  }

  /**
   * Detect country using timezone (simple heuristic)
   */
  function detectCountry(): void {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryMap: Record<string, string> = {
      'Asia/Singapore': 'sg',
      'Asia/Kuala_Lumpur': 'my',
      'Asia/Manila': 'ph',
      'Asia/Jakarta': 'id',
      'Asia/Bangkok': 'th',
      'Asia/Ho_Chi_Minh': 'vn',
    };
    config.country = countryMap[timezone] || 'unknown';
  }

  /**
   * Define an ad slot
   */
  function defineSlot(slotId: string, slotConfig: SlotConfig): void {
    slots.set(slotId, {
      ...slotConfig,
      elementId: slotConfig.elementId || slotId,
    });
  }

  /**
   * Set targeting key-value
   */
  function setTargeting(key: string, value: string): void {
    targeting.set(key, value);
  }

  /**
   * Clear all targeting
   */
  function clearTargeting(): void {
    targeting.clear();
  }

  /**
   * Request and display ads for all defined slots
   */
  async function display(): Promise<void> {
    if (!config.serverUrl) {
      console.error('MIMSAds: Server URL not configured. Call MIMSAds.init() first.');
      return;
    }

    if (slots.size === 0) {
      console.warn('MIMSAds: No slots defined. Call MIMSAds.defineSlot() first.');
      return;
    }

    try {
      const slotsArray = Array.from(slots.entries()).map(([id, cfg]) => ({
        id,
        width: cfg.width,
        height: cfg.height,
        ad_unit: cfg.adUnit || '',
      }));

      const targetingObj: Record<string, string> = {};
      targeting.forEach((value, key) => {
        targetingObj[key] = value;
      });

      const response = await fetch(`${config.serverUrl}/v1/ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': config.userId || '',
        },
        body: JSON.stringify({
          slots: slotsArray,
          targeting: targetingObj,
          user_id: config.userId,
          platform: config.platform,
          country: config.country,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.ads && Array.isArray(data.ads)) {
        for (const ad of data.ads) {
          renderAd(ad);
        }
      }
    } catch (error) {
      console.error('MIMSAds: Failed to fetch ads', error);
    }
  }

  /**
   * Render an ad in its slot
   */
  function renderAd(ad: AdResult): void {
    const slotConfig = slots.get(ad.slot_id);
    if (!slotConfig) return;

    const container = document.getElementById(slotConfig.elementId || ad.slot_id);
    if (!container) {
      console.warn(`MIMSAds: Container element not found for slot ${ad.slot_id}`);
      return;
    }

    // Store the ad for reference
    displayedAds.set(ad.slot_id, ad);

    // Create ad container
    const adContainer = document.createElement('div');
    adContainer.id = `mims-ad-${ad.slot_id}`;
    adContainer.style.cssText = `
      width: ${ad.width}px;
      height: ${ad.height}px;
      position: relative;
      overflow: hidden;
    `;

    // Create clickable link
    const link = document.createElement('a');
    link.href = ad.tracking.click;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'block';

    // Create image
    const img = document.createElement('img');
    img.src = ad.image_url;
    img.alt = 'Advertisement';
    img.style.cssText = `
      width: ${ad.width}px;
      height: ${ad.height}px;
      display: block;
      border: none;
    `;

    // Assemble elements
    link.appendChild(img);
    adContainer.appendChild(link);

    // Clear container and add ad
    container.innerHTML = '';
    container.appendChild(adContainer);

    // Fire impression pixel
    firePixel(ad.tracking.impression);

    // Set up viewability tracking
    setupViewabilityTracking(ad, adContainer);
  }

  /**
   * Fire a tracking pixel
   */
  function firePixel(url: string): void {
    const img = new Image(1, 1);
    img.src = url;
  }

  /**
   * Set up viewability tracking using Intersection Observer
   * Viewable = 50% visible for at least 1 second (IAB standard)
   */
  function setupViewabilityTracking(ad: AdResult, element: HTMLElement): void {
    let viewableTimer: number | null = null;
    let hasBeenViewed = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.5) {
            // 50% or more visible - start timer
            if (!viewableTimer && !hasBeenViewed) {
              viewableTimer = window.setTimeout(() => {
                if (!hasBeenViewed) {
                  hasBeenViewed = true;
                  firePixel(ad.tracking.viewable);
                }
              }, 1000); // 1 second
            }
          } else {
            // Less than 50% visible - cancel timer
            if (viewableTimer) {
              clearTimeout(viewableTimer);
              viewableTimer = null;
            }
          }
        }
      },
      {
        threshold: [0, 0.5, 1],
      }
    );

    observer.observe(element);
    viewabilityObservers.set(ad.slot_id, observer);
  }

  /**
   * Destroy all ads and clean up
   */
  function destroyAll(): void {
    // Clean up observers
    viewabilityObservers.forEach((observer) => {
      observer.disconnect();
    });
    viewabilityObservers.clear();

    // Clear displayed ads
    displayedAds.forEach((ad, slotId) => {
      const slotConfig = slots.get(slotId);
      if (slotConfig) {
        const container = document.getElementById(slotConfig.elementId || slotId);
        if (container) {
          container.innerHTML = '';
        }
      }
    });
    displayedAds.clear();
  }

  /**
   * Refresh ads for all slots
   */
  async function refresh(): Promise<void> {
    destroyAll();
    await display();
  }

  /**
   * Get current configuration
   */
  function getConfig(): Config {
    return { ...config };
  }

  /**
   * Get user ID
   */
  function getUserId(): string {
    return config.userId || '';
  }

  // Public API
  return {
    init,
    defineSlot,
    setTargeting,
    clearTargeting,
    display,
    refresh,
    destroyAll,
    getConfig,
    getUserId,
  };
})();

// Make available globally
(window as any).MIMSAds = MIMSAds;
