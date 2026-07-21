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

// Salaries are in INR.
const MOCK_JOBS = [
  {
    source: "manual",
    externalId: "mock-1",
    title: "Senior Frontend Engineer (React)",
    company: "Nimbus Cloud",
    location: "Bengaluru / Remote",
    url: "https://example.com/jobs/nimbus-frontend",
    description:
      "We are hiring a Senior Frontend Engineer to build our React and Next.js dashboard. You will work with TypeScript, Tailwind CSS, and a Node.js backend. Experience with GraphQL and server-side rendering is a plus. 5+ years of frontend experience required.",
    salaryRange: "₹35,00,000 – ₹50,00,000",
  },
  {
    source: "manual",
    externalId: "mock-2",
    title: "Full Stack Engineer",
    company: "Beacon Labs",
    location: "Remote (India)",
    url: "https://example.com/jobs/beacon-fullstack",
    description:
      "Join Beacon Labs as a Full Stack Engineer working across React, Node.js, Express, and PostgreSQL. We value strong TypeScript skills and experience shipping REST APIs. Bonus: AWS and Docker.",
    salaryRange: "₹28,00,000 – ₹42,00,000",
  },
  {
    source: "manual",
    externalId: "mock-3",
    title: "Staff Backend Engineer (Go)",
    company: "Quill Systems",
    location: "Hyderabad, India",
    url: "https://example.com/jobs/quill-backend",
    description:
      "Staff Backend Engineer to design distributed systems in Go and Kubernetes. Deep experience with gRPC, Postgres, and cloud infrastructure required. This is not a frontend role.",
    salaryRange: "₹50,00,000 – ₹70,00,000",
  },
  {
    source: "manual",
    externalId: "mock-4",
    title: "Software Engineer, Platform",
    company: "Lumen Data",
    location: "Remote (India)",
    url: "https://example.com/jobs/lumen-platform",
    description:
      "Platform Software Engineer building internal tools with TypeScript, Node.js, and React. You will own CI/CD pipelines using GitHub Actions and Docker, and write tests with Jest. PostgreSQL experience valued.",
    salaryRange: "₹25,00,000 – ₹38,00,000",
  },
  {
    source: "manual",
    externalId: "mock-5",
    title: "Junior Web Developer",
    company: "Sprout Media",
    location: "Pune, India",
    url: "https://example.com/jobs/sprout-junior",
    description:
      "Entry-level Web Developer role. Build marketing pages in HTML, CSS, and a bit of JavaScript. Great for new grads. No backend experience required.",
    salaryRange: "₹6,00,000 – ₹9,00,000",
  },
];

// Verified live public boards (probed against the Greenhouse/Lever APIs).
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
      excludedCompanies: JSON.stringify(["Sprout Media"]),
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

  for (const job of MOCK_JOBS) {
    await prisma.jobListing.upsert({
      where: {
        source_externalId: { source: job.source, externalId: job.externalId },
      },
      update: {
        location: job.location,
        salaryRange: job.salaryRange,
        description: job.description,
      },
      create: {
        ...job,
        postedDate: new Date(),
      },
    });
  }

  for (const board of SEED_BOARDS) {
    await prisma.board.upsert({
      where: { source_slug: { source: board.source, slug: board.slug } },
      update: { label: board.label },
      create: board,
    });
  }

  console.log(
    `Seeded user ${user.email} (password: ${DEFAULT_USER_PASSWORD}) and ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD}), ${MOCK_JOBS.length} mock jobs, ${SEED_BOARDS.length} boards.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
