import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How FormPilot AI fills a form | FormPilot AI',
  description: 'What FormPilot AI is, how the knowledge base and Chrome extension work, and how a batch of sites is filled without submitting them.',
};

function Shot({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-8">
      <img src={src} alt={alt} className="w-full rounded-2xl border border-slate-200 shadow-sm bg-white" />
      <figcaption className="mt-3 text-sm leading-relaxed text-slate-500">{caption}</figcaption>
    </figure>
  );
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1540px] items-center justify-between px-4 sm:px-8 lg:px-12">
          <Link href="/">
            <img src="/brand/logo-full.png" alt="FormPilot AI" className="h-10 w-auto sm:h-12" />
          </Link>
          <nav className="flex items-center gap-4 text-xs font-semibold text-slate-600 sm:gap-6">
            <Link href="/" className="hover:text-navy-800">Home</Link>
            <Link href="/demo-form" className="hidden hover:text-navy-800 sm:inline">Demo form</Link>
            <Link href="/login" className="rounded-xl bg-navy-800 px-4 py-2.5 text-white hover:bg-navy-900">
              Open workspace
            </Link>
          </nav>
        </div>
      </header>

      <article className="blog-copy mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <p className="mb-4 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-800">
          InnovChromatic · November 2026
        </p>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-navy-800 sm:text-5xl">
          A form should already know who you are.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          FormPilot AI keeps a resume, a profile, and the answers you have already given, then uses them to fill the form that is open in the browser. This is the full path: what gets stored, how a single page is answered, how a missing cover letter is drafted, and how a list of sites becomes a batch you can read afterwards.
        </p>
        <p className="mt-4 text-sm text-slate-500">Sahil Sarawgi · from the live product at formpilot.innovchromatic.tech</p>

        <Shot
          src="/blog/formpilot-home.png"
          alt="FormPilot AI home page with the grounded-document headline and a preview of the side panel."
          caption="The public home page. The card under the headline is a preview of the in-page copilot: the fields it found, how sure it is, and which documents it is allowed to use."
        />

        <h2>What the project is</h2>
        <p>
          FormPilot is two programs that share one brain. The website is the control room. You keep documents there, turn them on or off, set reminders, read past fills, and launch a batch across several URLs. The Chrome extension is the hand on the page. It reads the form you are looking at and writes the answers back into the real inputs.
        </p>
        <p>
          It is meant for facts that already exist somewhere you trust: your name, a phone number, a project link, the resume that matches a developer role, a cover letter you already accepted for a company. When the knowledge base has nothing that supports a question, the field stays blank. Passwords, card numbers, and government ID numbers are not stored.
        </p>
        <p>
          The web app is Next.js. Files sit in a private S3 bucket. Text and vectors sit in Postgres with pgvector. Answers and embeddings come from Gemini. When a letter needs a look at the company, that research goes through Tavily. The extension is a separate Chrome package. Reloading it means loading the unpacked build in <code>apps/extension/dist</code>. A deploy of the website does not update the extension.
        </p>

        <h2>The knowledge base</h2>
        <p>
          Every answer is supposed to start from a document you uploaded or from a fact you already confirmed. A PDF is read into text, including the words behind a hyperlink, then split into chunks and embedded. The vectors sit beside the document rows so a question can find the passage that actually mentions the fact. The original file stays in S3 so a resume upload can attach that file, not a retyped summary of it.
        </p>
        <p>
          Each document has a short description. That description is how a resume marked “only for my dev roles” can be chosen on an engineering application instead of a different resume in the same library. A document can be switched off. Off means the next fill cannot see it. The welcome profile — name, email, phone, address — is its own small document, so those fields do not depend on a resume happening to mention them.
        </p>
        <p>
          Search is both a vector search and a keyword search. The vector search finds a passage that is about the question even when the wording differs. The keyword search catches exact tokens such as a phone number, a city, or a skill name. Past fills are added as question-and-answer lines. The website, the URL, and the page title are left out, so an old login screen cannot leak into a job application.
        </p>

        <Shot
          src="/blog/formpilot-knowledge-base.png"
          alt="Knowledge base with a cover letter, two resumes, and the basic profile, each marked active."
          caption="The workspace knowledge base. Four documents are active: a generated cover letter, two resumes, and the basic profile collected during setup."
        />

        <h2>How one form gets filled</h2>
        <p>
          You open a form, then open FormPilot from the floating button. That button toggles the Chrome side panel on the same tab. It does not open a new window. The content script reads only the fields that are on the screen: labels, text boxes, radios, selects, and file inputs. A wizard is filled one step at a time, because the next step is not in the page yet. You run fill again after you move forward.
        </p>
        <ol className="my-6 space-y-4">
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-white">1</span>
            <span>The schema goes to <code>/api/fill-form</code>. The questions are embedded in one batch, then each one is matched against the active documents.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-white">2</span>
            <span>One Gemini call answers the whole page. A choice has to land on a real option. “1–2 years”, “1-2 years”, and a stated “1.5 years” can select the same radio.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-white">3</span>
            <span>File fields are a separate decision. A resume label looks for a resume, and a developer role prefers the developer resume. A cover letter or proposal uses a saved file of that kind when one exists.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-800 text-xs font-bold text-white">4</span>
            <span>The extension writes each value and fires the input events the page expects, so a React form actually updates. A hidden file input receives the PDF, and the site’s own upload control changes.</span>
          </li>
        </ol>
        <p>
          A passport, a photo, or a certificate stays empty. Those are not documents FormPilot should invent. A cover letter or a proposal is different: if the library does not already have one, a second agent can draft it.
        </p>

        <h2>Drafting a document</h2>
        <p>
          The other questions on the page are filled first. Then the page blurs and tells you which document it is making. There is no extra confirmation step before the draft starts. Tavily looks up the company. Gemini writes three to five paragraphs in the first person and is not allowed to invent a job that is not in the knowledge base. You can preview the PDF, accept it, or reject it.
        </p>
        <p>
          Accept is the only moment the file is stored. The PDF is written to S3, a knowledge-base row is created, and the text is indexed so the next form can attach that same letter. Reject clears the draft. It never becomes a document. The overlay lives on the page, and the extension asks the background script to call the API, because a content script is not allowed to call another origin directly.
        </p>

        <h2>The demo form</h2>
        <p>
          The site includes a career-style form so the whole loop can be tried without leaving FormPilot. It has a name, contact details, links, a job title, years, a work-arrangement select, a work-authorization checkbox, a relocation radio, two long answers, and a resume upload. A complete run fills the facts the knowledge base actually has and attaches the developer resume. The long answers are written from that material. A field with no supporting fact is left alone.
        </p>

        <Shot
          src="/blog/formpilot-demo-form.png"
          alt="FormPilot demo form for a senior full-stack role, with personal details, experience, written questions, and a resume upload."
          caption="The built-in demo form. It is an ordinary page the extension can read: text, a select, radios, a checkbox, two written questions, and a file input."
        />

        <h2>Many sites, one batch</h2>
        <p>
          The fleet is the same fill, pointed at a list of addresses instead of the tab you are looking at. You paste one URL per line and launch the runner. The server fetches each page. A normal HTML form is read from its inputs. A client-side wizard that only renders the first step still has the rest of its fields in the page data, and those fields are used. A single-page site with no inputs in the first HTML is read from the script that draws the form.
        </p>
        <p>
          Sites are handled one after another, because each page is a model call. While a batch is running, the dashboard polls and updates the cards. A finished card shows the status, how many fields were answered, the average confidence, and the question-and-answer list. That list is the recent history of the run. You can open it later and see what would have been typed on each site.
        </p>
        <p>
          The fleet does not submit the other website. It records the answers FormPilot would use. A checkbox on the runner can also save a row into FormPilot history when the average confidence is at least 90 percent. That row is still inside FormPilot. It is not an HTTP post to the job application, the contact form, or a public form host. Those stay unsent until you open them and submit them yourself.
        </p>

        <Shot
          src="/blog/formpilot-fleet.png"
          alt="Bulk runner with pasted form URLs and recent batch cards showing filled fields and confidence."
          caption="A real batch. The runner visited the demo form, a job application, a Jotform, and a contact page, then kept each question and answer on the batch card."
        />

        <h2>Reminders, history, and tone</h2>
        <p>
          A reminder is a form you still owe. The server checks reminders while the app is running. The extension can show one, and it stays up until you mark it read. Closing it only hides it until the next check.
        </p>
        <p>
          History is the set of fills that were saved as submissions. Later fills may reuse those question-and-answer lines. They do not reuse the site name or the page title. The History tab and the batch cards are different lists. The batch card is the log of a fleet run. History is the log of fills you chose to keep.
        </p>
        <p>
          Tone changes how a paragraph is written: requesting, factual, professional, or casual. It does not give the model permission to invent a year of experience, a company, or a date that is not in the documents.
        </p>

        <h2>Where it runs</h2>
        <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-800 text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Piece</th>
                <th className="px-4 py-3 font-semibold">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold text-navy-800">Web app</td>
                <td className="px-4 py-3">Next.js on Fargate, behind a load balancer, at formpilot.innovchromatic.tech</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-navy-800">Database</td>
                <td className="px-4 py-3">Postgres 16 with pgvector, private to the network. Documents, answers, jobs, and batches live here.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-navy-800">Files</td>
                <td className="px-4 py-3">Encrypted S3. A drafted PDF is uploaded only after you accept it.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-navy-800">Model</td>
                <td className="px-4 py-3">Gemini answers the page and builds the embeddings. Tavily is used when a letter needs company research.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-navy-800">Extension</td>
                <td className="px-4 py-3">Chrome Manifest V3. The side panel calls the API. The content script talks to the page through the background script.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Turning the system off stops the web tasks and the database. The load balancer stays, so the domain does not have to be pointed somewhere new when the system comes back. A stopped database starts itself again after seven days.
        </p>

        <h2>What a finished fill looks like</h2>
        <p>
          On the demo form, a complete run can fill the name, the email, the phone, the city, the profile links, the title, the years, the work arrangement, relocation, a short reason, a skills paragraph, and the developer resume. On a job form that also asks for a cover letter, the saved letter is attached instead of starting a new draft, and an experience radio resolves to the closest range the documents support. Optional questions with no supporting fact stay blank.
        </p>
        <p>
          That is the loop. Documents in, a page read, one grounded answer, a file only when it belongs there, and a person still in charge of the final submit.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/demo-form" className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-3 text-sm font-bold text-white hover:bg-navy-900">
            Try the demo form <ArrowRight size={16} className="text-cyan-300" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-navy-800 hover:border-slate-300">
            Open the workspace
          </Link>
        </div>
      </article>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} FormPilot AI · InnovChromatic</span>
          <span className="flex gap-4 font-semibold">
            <Link href="/" className="hover:text-navy-800">Home</Link>
            <a href="https://www.innovchromatic.tech" className="text-cyan-700 hover:underline">InnovChromatic</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
