// Pure functions — no server imports, safe to use in Client Components

function slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) || 'hello'
  }
  
  export function resolveFromAddress(
    slug: string,
    customDomain: string | null,
    customDomainVerified: boolean,
    companyName: string
  ): string {
    if (customDomain && customDomainVerified) {
      return `${slugify(companyName)}@${customDomain}`
    }
    return `${slug}@mail.getrivera.co`
  }