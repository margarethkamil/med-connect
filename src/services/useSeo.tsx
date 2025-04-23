import { useEffect } from 'react';
import { SeoProps, updateSeoMetadata } from './seo';

/**
 * React hook to update SEO metadata when a component mounts or props change
 * @param seoProps SEO metadata properties
 */
export const useSeo = (seoProps: SeoProps) => {
  useEffect(() => {
    // Update all SEO metadata when component mounts or props change
    updateSeoMetadata(seoProps);
    
    // No cleanup needed as we don't want to remove metadata when component unmounts
  }, [
    // Include all seoProps properties in the dependency array
    seoProps.title,
    seoProps.description,
    seoProps.canonical,
    seoProps.ogType,
    seoProps.ogImage,
    seoProps.ogUrl,
    // For arrays, we need to stringify them to detect changes
    JSON.stringify(seoProps.keywords),
    // For objects, we need to stringify them to detect changes
    JSON.stringify(seoProps.structuredData)
  ]);
}; 