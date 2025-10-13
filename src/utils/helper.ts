// Get domain-specific SMTP configuration
export const getDomainSMTPConfig = (domain: string) => {
  const configs = {
    OES: {
      host: process.env.PMTA_HOST_OES,
      port: parseInt(process.env.PMTA_PORT_OES || "587"),
      user: process.env.PMTA_USERNAME_OES,
      password: process.env.PMTA_PASSWORD_OES,
      from: process.env.EMAIL_OES,
      cc: process.env.CC_EMAIL_OES,
      name: process.env.PMTA_NAME_OES,
    },
    OOC: {
      host: process.env.PMTA_HOST_OOC,
      port: parseInt(process.env.PMTA_PORT_OOC || "587"),
      user: process.env.PMTA_USERNAME_OOC,
      password: process.env.PMTA_PASSWORD_OOC,
      from: process.env.EMAIL_OOC,
      cc: process.env.CC_EMAIL_OOC,
      name: process.env.PMTA_NAME_OOC,
    },
    OOR: {
      host: process.env.PMTA_HOST_OOR,
      port: parseInt(process.env.PMTA_PORT_OOR || "587"),
      user: process.env.PMTA_USERNAME_OOR,
      password: process.env.PMTA_PASSWORD_OOR,
      from: process.env.EMAIL_OOR,
      cc: process.env.CC_EMAIL_OOR,
      name: process.env.PMTA_NAME_OOR,
    },
    FOC: {
      host: process.env.PMTA_HOST_FOC,
      port: parseInt(process.env.PMTA_PORT_FOC || "587"),
      user: process.env.PMTA_USERNAME_FOC,
      password: process.env.PMTA_PASSWORD_FOC,
      from: process.env.EMAIL_FOC,
      cc: process.env.CC_EMAIL_FOC,
      name: process.env.PMTA_NAME_FOC,
    },
  };
  return configs[domain as keyof typeof configs];
};

 // map full domain name to short code
export const domainShortCodes: Record<string, string> = {
  "Osha Outreach": "OOR",
  "Osha Online Center": "OOC",
  "Osha Education School": "OES",
};

// Helper function to get domain email
export const getDomainEmail = (domain: string): string => {
  // console.log("domain: ", domain);
  const domainEmails = {
    OOR: process.env.NEXT_PUBLIC_EMAIL_OOR,
    OOC: process.env.NEXT_PUBLIC_EMAIL_OOC,
    OES: process.env.NEXT_PUBLIC_EMAIL_OES,
    FOC: process.env.NEXT_PUBLIC_EMAIL_FOC,
  };
  return domainEmails[domain as keyof typeof domainEmails] || "";
};

// Helper function to get user-specific email for frontend display
export const getUserEmail = (userData: any): string => {
  const username = userData.user_name || userData.full_name || userData._id;
  const userSuffix = username.charAt(0).toUpperCase();
  
  // Get user-specific email from environment variables
  const userEmail = process.env[`NEXT_PUBLIC_EMAIL_${userSuffix}`];
  if (userEmail) {
    console.log(`Using user-specific email for ${username}: ${userEmail}`);
    return userEmail;
  }
  
  // Fallback to domain email if user-specific email not found
  const domain = domainShortCodes[userData.assignedDomain];
  const domainEmail = domain ? getDomainEmail(domain) : "";
  console.log(`User-specific email not found for ${username}, using domain email: ${domainEmail}`);
  return domainEmail;
};

// Get user-specific SMTP configuration for outbound leads
export const getUserSMTPConfig = (userData: any, domain: string) => {

  // console.log("userData: ", userData);
  const username = userData.user_name || userData.full_name || userData._id;
  
  // Get first letter of username for env variable suffix
  const userSuffix = username.charAt(0).toUpperCase();
  const domainShortCode = domainShortCodes[userData.assignedDomain];
  // console.log("domainShortCode: ", domainShortCode);

  // Build environment variable names based on user suffix
  const envVars = {
    host: process.env[`PMTA_HOST_${domainShortCode}_${userSuffix}`],
    port: parseInt(process.env[`PMTA_PORT_${domainShortCode}_${userSuffix}`] || "587"),
    user: process.env[`PMTA_USERNAME_${domainShortCode}_${userSuffix}`],
    password: process.env[`PMTA_PASSWORD_${domainShortCode}_${userSuffix}`],
    from: process.env[`EMAIL_${domainShortCode}_${userSuffix}`],
    cc: process.env[`CC_EMAIL_${domainShortCode}_${userSuffix}`],
    name: process.env[`PMTA_NAME_${domainShortCode}_${userSuffix}`],
  };
  // Check if user-specific config exists
  if (envVars.host && envVars.user && envVars.password) {
  //  console.log("envVars: ", envVars);
    return envVars;
  }

  // Fallback to domain-specific config if user-specific config not found
  console.log(`User-specific SMTP config not found for ${username}, falling back to domain config`);
  return getDomainSMTPConfig(domain);
};