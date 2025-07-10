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
