import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_USER_EMAIL = "you@jobpilot.local";
const DEFAULT_USER_PASSWORD = "jobpilot123";

// Plain test account for quick local access — not a special "admin" role,
// there is no admin/permissions system in this app. Every user is equal and
// only ever sees their own data (see docs/HOW_IT_WORKS.md, section 6).
const ADMIN_EMAIL = "admin@jobpilot.local";
const ADMIN_PASSWORD = "admin";

const MASTER_RESUME = `Jordan Lee — Software Engineer
Summary: Full-stack engineer with 5 years building web apps in TypeScript, React, and Node.js. Experience with REST APIs, PostgreSQL, and AWS.

Experience:
- Senior Software Engineer, Acme Corp (2022–present): Led a 4-person team building a React + Node.js dashboard serving 20k daily users. Cut page load time 40% by introducing server-side rendering with Next.js. Designed REST and GraphQL APIs backed by PostgreSQL.
- Software Engineer, Beta Inc (2019–2022): Built customer-facing features in React and TypeScript. Implemented CI/CD with GitHub Actions and Docker. Improved test coverage from 30% to 85% with Jest.

Skills: TypeScript, JavaScript, React, Next.js, Node.js, Express, PostgreSQL, GraphQL, REST, AWS, Docker, CI/CD, Jest, Tailwind CSS.

Education: B.S. Computer Science, State University (2019).`;

// Verified live public boards (probed against the Greenhouse/Lever APIs).
// Real jobs come from these via the aggregator — no placeholder/mock listings.
const SEED_BOARDS = [
  { source: "greenhouse", slug: "groww", label: "Groww" },
  { source: "greenhouse", slug: "postman", label: "Postman" },
  { source: "greenhouse", slug: "phonepe", label: "PhonePe" },
  { source: "greenhouse", slug: "druva", label: "Druva" },
  { source: "lever", slug: "cred", label: "CRED" },
  { source: "lever", slug: "freshworks", label: "Freshworks" },
  { source: "lever", slug: "meesho", label: "Meesho" },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {
      salaryFloor: 2000000,
      targetLocations: JSON.stringify(["Remote", "Bengaluru"]),
      scheduleTimes: JSON.stringify(["09:00", "14:00", "19:00"]),
      excludedCompanies: JSON.stringify([]),
    },
    create: {
      email: DEFAULT_USER_EMAIL,
      passwordHash: await bcrypt.hash(DEFAULT_USER_PASSWORD, 10),
      masterResume: MASTER_RESUME,
      coverLetterTemplates: JSON.stringify([
        {
          tone: "professional",
          body: "Dear Hiring Manager, I am excited to apply for this role. My background aligns well with your needs...",
        },
        {
          tone: "enthusiastic",
          body: "Hi team! I've been following your work and would love to contribute...",
        },
      ]),
      targetRoles: JSON.stringify([
        "Software Engineer",
        "Full Stack Engineer",
        "Frontend Engineer",
      ]),
      targetLocations: JSON.stringify(["Remote", "Bengaluru"]),
      salaryFloor: 2000000, // ₹20,00,000
      excludedCompanies: JSON.stringify([]),
      dailyGoal: 50,
      scheduleEnabled: false,
      scheduleTimes: JSON.stringify(["09:00", "14:00", "19:00"]),
    },
  });

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      masterResume: "",
      coverLetterTemplates: JSON.stringify([
        { tone: "professional", body: "" },
      ]),
      targetRoles: JSON.stringify([]),
      targetLocations: JSON.stringify([]),
      salaryFloor: null,
      excludedCompanies: JSON.stringify([]),
      dailyGoal: 50,
      scheduleEnabled: false,
      scheduleTimes: JSON.stringify(["09:00", "14:00", "19:00"]),
    },
  });

  for (const board of SEED_BOARDS) {
    await prisma.board.upsert({
      where: { source_slug: { source: board.source, slug: board.slug } },
      update: { label: board.label },
      create: board,
    });
  }

  console.log(
    `Seeded user ${user.email} (password: ${DEFAULT_USER_PASSWORD}) and ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD}), ${SEED_BOARDS.length} boards.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
