// src/services/seo.ts
// SEO utilities for implementing metadata, titles, and descriptions

/**
 * Interface for SEO metadata properties
 */
export interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  ogUrl?: string;
  keywords?: string[];
  structuredData?: object;
}

// Base site information
const siteName = 'MedConnect - Doctor Booking';
const siteUrl = 'https://doctor-booking-c4af2.web.app';

/**
 * Apply SEO metadata to the document
 */
export const updateSeoMetadata = (props: SeoProps): void => {
  // Update page title with site name
  const fullTitle = `${props.title} | ${siteName}`;
  document.title = fullTitle;
  
  // Update meta tags
  updateMetaTag('description', props.description);
  
  // Open Graph tags
  updateMetaTag('og:title', fullTitle);
  updateMetaTag('og:description', props.description);
  updateMetaTag('og:type', props.ogType || 'website');
  updateMetaTag('og:site_name', siteName);
  
  if (props.ogImage) {
    updateMetaTag('og:image', props.ogImage);
  }
  
  if (props.ogUrl) {
    updateMetaTag('og:url', props.ogUrl);
  } else if (props.canonical) {
    updateMetaTag('og:url', props.canonical);
  }
  
  // Twitter tags
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', fullTitle);
  updateMetaTag('twitter:description', props.description);
  
  if (props.ogImage) {
    updateMetaTag('twitter:image', props.ogImage);
  }
  
  // Canonical URL
  updateCanonicalLink(props.canonical || window.location.href);
  
  // Keywords
  if (props.keywords && props.keywords.length > 0) {
    updateMetaTag('keywords', props.keywords.join(', '));
  }
  
  // Structured data
  if (props.structuredData) {
    updateStructuredData(props.structuredData);
  }
};

/**
 * Update or create a meta tag
 */
const updateMetaTag = (name: string, content: string): void => {
  // Try to find an existing tag
  let meta = document.querySelector(`meta[name="${name}"]`);
  
  // If not found, try property attribute (for Open Graph)
  if (!meta) {
    meta = document.querySelector(`meta[property="${name}"]`);
  }
  
  if (meta) {
    // Update existing tag
    meta.setAttribute('content', content);
  } else {
    // Create new tag
    meta = document.createElement('meta');
    
    // Use property attribute for Open Graph and name for others
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }
};

/**
 * Update or create canonical link
 */
const updateCanonicalLink = (url: string): void => {
  let canonical = document.querySelector('link[rel="canonical"]');
  
  if (canonical) {
    canonical.setAttribute('href', url);
  } else {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', url);
    document.head.appendChild(canonical);
  }
};

/**
 * Add structured data script to the page
 */
const updateStructuredData = (data: object): void => {
  // Remove any existing structured data
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Create new script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

/**
 * Ready-to-use SEO configurations for common pages
 */
export const seoConfigs = {
  home: (): SeoProps => ({
    title: 'Find & Book Doctor Appointments',
    description: 'Book appointments with qualified doctors near you. Fast, easy online scheduling available 24/7.',
    ogType: 'website',
    ogImage: `${siteUrl}/images/home-banner.jpg`,
    keywords: ['doctor appointments', 'medical booking', 'find doctor', 'healthcare scheduling'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/doctors?search={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  }),
  
  doctors: (): SeoProps => ({
    title: 'Find Doctors Near You',
    description: 'Browse our network of experienced medical professionals. Filter by specialty, location, and availability.',
    ogType: 'website',
    ogImage: `${siteUrl}/images/doctors-banner.jpg`,
    keywords: ['find doctors', 'doctor listings', 'medical specialists', 'healthcare providers']
  }),
  
  doctorDetail: (doctor: { name: string; specialty: string; location?: string }): SeoProps => ({
    title: `Dr. ${doctor.name} - ${doctor.specialty}`,
    description: `Book an appointment with Dr. ${doctor.name}, specialized in ${doctor.specialty}${doctor.location ? ` located in ${doctor.location}` : ''}.`,
    ogType: 'profile',
    keywords: [doctor.name, doctor.specialty, 'doctor appointment', 'medical consultation']
  }),
  
  appointments: (): SeoProps => ({
    title: 'My Appointments',
    description: 'View and manage your upcoming doctor appointments.',
    ogType: 'website',
    keywords: ['medical appointments', 'doctor scheduling', 'appointment management']
  }),
  
  login: (): SeoProps => ({
    title: 'Sign In',
    description: 'Sign in to manage your doctor appointments and medical consultations.',
    ogType: 'website',
    keywords: ['login', 'sign in', 'medical account', 'patient portal']
  }),
  
  admin: {
    calendar: (): SeoProps => ({
      title: 'Admin Calendar',
      description: 'Administrative calendar for managing doctor appointments and scheduling.',
      ogType: 'website'
    }),
    
    doctors: (): SeoProps => ({
      title: 'Manage Doctors',
      description: 'Administrative interface for managing doctor profiles, availability, and information.',
      ogType: 'website'
    })
  }
};

/**
 * Hook-friendly SEO implementation
 * Use this in a custom React hook if needed
 */
export const useSeo = (props: SeoProps): void => {
  // This function could be expanded to be used with React's useEffect
  updateSeoMetadata(props);
}; 