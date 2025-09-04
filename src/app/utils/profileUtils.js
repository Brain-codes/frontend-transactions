/**
 * Profile Data Utilities
 * Handles loading and processing user profile data
 */

/**
 * Loads profile data from localStorage and extracts partner name
 * @returns {Promise<Object>} Object containing partnerName and organizationId
 */
export const loadProfileData = async () => {
  try {
    const profileData = localStorage.getItem("user_profile");
    if (profileData) {
      const profile = JSON.parse(profileData);
      return {
        partnerName: profile.organizations?.name || "",
        organizationId: profile.organization_id || "",
        success: true,
      };
    }
    return {
      partnerName: "",
      organizationId: "",
      success: false,
      error: "No profile data found",
    };
  } catch (error) {
    console.error("Error loading profile data:", error);
    return {
      partnerName: "",
      organizationId: "",
      success: false,
      error: "Failed to load profile data",
    };
  }
};

/**
 * Gets organization ID from stored profile
 * @returns {string|null} Organization ID or null if not found
 */
export const getOrganizationId = () => {
  try {
    const profileData = localStorage.getItem("user_profile");
    if (profileData) {
      const profile = JSON.parse(profileData);
      return profile.organization_id || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting organization ID:", error);
    return null;
  }
};
