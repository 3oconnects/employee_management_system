// ============================================================================
// OZOFI NEXUS — PRODUCT BRAND (single source of truth)
// ============================================================================
// Product identity is fixed and not tenant-configurable. A customer's own
// organisation name and logo (the "workspace") come from Settings → General
// via useWorkspace(); they appear alongside, never instead of, the product.
//
//   Product   → Ozofi Nexus (this file)
//   Company   → Ozofi (maker of the product)
//   Workspace → the customer organisation using the product (tenant settings)
// ============================================================================

export const BRAND = {
    productName: 'Ozofi Nexus',
    shortName: 'Nexus',
    companyName: 'Ozofi',
    tagline: 'Workforce Management Platform',
    description: 'Ozofi Nexus is a workforce management platform for people, attendance, leave, payroll and approvals.',
    themeColor: '#2F5BEA',
    assets: {
        icon: '/brand/nexus-icon.svg',
    },
} as const;

/** "Employees · Ozofi Nexus" */
export const pageTitle = (page?: string): string =>
    page ? `${page} · ${BRAND.productName}` : `${BRAND.productName} · ${BRAND.tagline}`;

export const copyright = (year: number = new Date().getFullYear()): string =>
    `© ${year} ${BRAND.companyName}`;
