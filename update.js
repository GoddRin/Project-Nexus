/* eslint-disable */
const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.siteLocation.update({ where: { slug: 'tunnel-1' }, data: { percentComplete: 90 } }).then(() => console.log('Done')).catch(console.error).finally(() => prisma['$disconnect']());
