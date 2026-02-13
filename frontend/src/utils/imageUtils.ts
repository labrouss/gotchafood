// Resolve image URL to full path
// Handles: full URLs (https://...), relative paths (/uploads/...), empty strings
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null;
  
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Relative path — prepend backend base
  let apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
  
  // Smart URL resolution based on current environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    console.log('🖼️ resolveImageUrl:', { url, hostname, protocol });
    
    // If we're NOT on localhost, construct backend URL from current hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const backendUrl = `${protocol}//${hostname}:3000`;
      const resolved = `${backendUrl}${url}`;
      console.log('   ✓ Resolved to:', resolved);
      return resolved;
    }
  }
  
  // Default: use env variable
  const backendBase = apiUrl.replace('/api', '');
  const resolved = `${backendBase}${url}`;
  console.log('   ✓ Using env fallback:', resolved);
  return resolved;
}

// Get a fallback placeholder if image fails or is missing
export function getImagePlaceholder(type: 'product' | 'category' = 'product'): string {
  return type === 'product'
    ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" font-size="64" text-anchor="middle" dy=".3em" fill="%239ca3af"%3E🍽️%3C/text%3E%3C/svg%3E'
    : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23f3f4f6" width="400" height="225"/%3E%3Ctext x="50%25" y="50%25" font-size="64" text-anchor="middle" dy=".3em" fill="%239ca3af"%3E📂%3C/text%3E%3C/svg%3E';
}
