# Automation-Risk Estimates for Creative Work: From Frey & Osborne to Task-Based Critiques and the Generative AI Era

## How Frey & Osborne estimated automation probabilities and why Choreographers get 0.4%

### What Frey & Osborne were estimating

The core object in the original *Frey & Osborne* framework is a **probability of “computerisation” (often paraphrased as automation)** at the **occupation** level, produced for **702 detailed U.S. occupations** (based on 2010-era occupational information). citeturn6view2turn8view0

A crucial point about interpretation: they explicitly frame the probability scale as a **rough timeline**—high-probability occupations are “likely to be substituted by computer capital relatively soon”—and they characterize the relevant horizon as “some unspecified number of years, perhaps a decade or two.” citeturn8view0

### The O*NET-based feature construction (what is “task-based” here)

Although their results are routinely described as “task-based,” the *Frey & Osborne* estimates are **not computed from worker-level task time-use**. Instead, they use **occupation-level descriptors from O*NET**, which aggregates survey/analyst information about work activities, skills, abilities, and knowledge for each occupation. citeturn6view2turn6view3turn6view4

Their “task-based” element enters in two places:

1. **Conceptual bottlenecks defined in terms of tasks/components of work.** They argue that three broad capabilities were bottlenecks (as of the early 2010s) for computerisation:  
   - *Perception and manipulation*  
   - *Creative intelligence*  
   - *Social intelligence* citeturn6view0turn6view1  

2. **A reduced set of O*NET variables used as proxies for those bottlenecks.** They operationalize the above by selecting **nine** O*NET variables (“features”) and forming each occupation’s feature vector. Their Table I lists the nine variables, grouped by the three bottleneck categories. citeturn6view3turn6view4

Those nine O*NET variables (as shown by *Frey & Osborne*, and also summarized by later reviewers) are: **Finger Dexterity; Manual Dexterity; Cramped Work Space, Awkward Positions; Originality; Fine Arts; Social Perceptiveness; Negotiation; Persuasion; Assisting and Caring for Others.** citeturn6view4turn57view1

They then treat each occupation as a point in this 9-dimensional space, representing how strongly that occupation relies on these bottleneck-related attributes. citeturn6view3turn6view4

### The expert labeling step (training data)

*Frey & Osborne* do not start with a purely data-driven mapping from tasks to automation. They begin by **hand-labeling** a subset of occupations:

- They note there are **70 occupations** in this “training set” (roughly 10% of the total), chosen where they were most confident in classification. citeturn6view3turn6view5  
- Their labeling process is described as based on “eyeballing” O*NET task descriptions and job descriptions (later critiques emphasize this subjectivity). citeturn6view5turn57view1  

### The statistical model: Gaussian process classifier → probabilities

With the 70 labeled occupations as training data and the 9 O*NET features per occupation, they estimate a probabilistic relationship between the features and whether an occupation is “automatable.” They implement a **Gaussian process classifier**, which then produces a **predicted probability** of computerisation for each of the full set of occupations. citeturn6view5turn54search0

### Where “Choreographers = 0.4%” comes from in their outputs

In their appendix table of estimated probabilities, **“Choreographers” appear with probability 0.004**, i.e., **0.4%**. citeturn4view0

This is a model output: choreographers were not necessarily part of the 70 hand-labeled occupations (the table shows some labeled occupations with explicit labels; “Choreographers” is listed among low-probability jobs without such a label marker). citeturn4view0turn6view5

### Why the model pushes choreographers toward the very low end

The logic is consistent with the “bottlenecks” and chosen features:

- “Choreographers” in O*NET are strongly associated with **Fine Arts** knowledge and an **Artistic** orientation, and require **Social Perceptiveness**, **Negotiation**, and **Persuasion** among listed skills/requirements—precisely the kinds of attributes *Frey & Osborne* treat as barriers to computerisation. citeturn22view0turn6view4  
- Because their classifier is trained to treat high levels of these “creative” and “social” features as evidence against full substitution, the predicted probability for an occupation that is strongly loaded on those attributes will tend to be near the low-risk tail. citeturn6view4turn6view5  

### Core assumptions embedded in the Frey–Osborne approach

Several assumptions are doing heavy lifting (and become central in later critiques):

1. **Occupation-level homogeneity.** Each occupation receives **one probability**, effectively treating within-occupation task variation as second-order. citeturn6view2turn10view0  
2. **Sufficiency of the “bottleneck” feature set.** The nine chosen O*NET variables are assumed to be a high-signal summary of what makes work hard to computerise. citeturn6view4turn57view1  
3. **Subjective expert labels generalize.** The model generalizes from **70 hand-labeled occupations** to the full set; the validity of probabilities hinges on the representativeness and reliability of those labels. citeturn6view5turn57view1  
4. **Technological feasibility focus.** The measure is framed around whether computerisation is *possible* given evolving capabilities, not whether it will be adopted given costs, regulation, demand, union responses, or organizational redesign. (This distinction becomes explicit in policy syntheses and task-based critiques.) citeturn8view0turn17view1turn19view0  
5. **Static task content (2010-era snapshot).** The underlying occupational/task descriptors reflect the period they measure; later users (including the U.S. GAO) note that the data and the analysis period can be misaligned and that observable labor-market changes may take longer to emerge. citeturn17view1turn17view3  

## How Arntz, Gregory, and Zierahn argue occupation-based estimates are overstated

### Their critique of the occupation-as-unit approach

entity["people","Melanie Arntz","labor economist"], entity["people","Terry Gregory","labor economist"], and entity["people","Ulrich Zierahn","labor economist"] argue that automation technologies typically target **tasks**, and that **jobs are bundles of tasks** whose composition varies across workers—even within the same occupation. This makes “occupation-based” probabilities (one risk per occupation) prone to **overstating job-level automation risk** when interpreted as job destruction. citeturn9view0turn10view0

They explicitly frame their contribution as moving from **automation risk of occupations** (in the Frey–Osborne style) to **automation risk of jobs defined by task content**, which yields substantially different aggregate results. citeturn9view0turn12view0turn12view4

### What their task-based method does differently (mechanically)

Their analysis combines two key ingredients:

1. A worker/job-level task dataset from the OECD’s entity["organization","OECD","intergovernmental org"] context, using the **Programme for the International Assessment of Adult Competencies (PIAAC)** task information to capture **within-occupation variation** in what people actually do. citeturn10view0turn15view15  
2. A mapping/estimation strategy that links task profiles to automation feasibility, producing probabilities that can differ across individuals even within the same occupation. citeturn12view0turn12view1turn12view2  

A technical complication they address is a **classification crosswalk problem**: PIAAC uses international occupation codes (ISCO) that do not map one-to-one into the U.S. SOC occupations used by *Frey & Osborne*. They describe using an **imputation strategy** to handle cases where a worker’s broad occupation can map to multiple detailed occupations with different automation probabilities. citeturn12view0turn12view1turn12view2

### Why their approach produces lower estimated “high-risk” shares

Their headline result is that the “high-risk” share drops sharply relative to the Frey–Osborne occupation-based framing:

- Using their task-based approach, they report that **on average across 21 OECD countries, about 9% of jobs are automatable**, much lower than occupation-based figures often associated with Frey–Osborne-style estimates. citeturn10view0turn15view15  
- In their discussion of why, they emphasize that many occupations contain **substantial shares of tasks that are not readily automatable**, such as **face-to-face interaction** and related interpersonal work, and that this task heterogeneity depresses the probability that an entire job is automated. citeturn12view4turn10view0  

Their figure comparing distributions shows the difference in shape: occupation-level approaches tend to produce a more polarized distribution (many occupations near 0 or near 1), while task-based approaches yield a more continuous distribution because workers differ in task mixes. citeturn12view3turn12view4turn12view5

### Summary of the methodological differences that matter most

What drives the lower estimates is not merely parameter tuning; it is structural:

- **Unit of analysis:** occupation (Frey–Osborne) versus individual/job task bundle (Arntz–Gregory–Zierahn). citeturn6view2turn12view0  
- **Variance source:** Frey–Osborne largely ignores within-occupation task variance because the O*NET signal is occupation-aggregated; Arntz–Gregory–Zierahn explicitly estimates and uses it. citeturn6view2turn10view0  
- **Interpretation:** Arntz–Gregory–Zierahn emphasize that task automation often implies **task reallocation and job redesign**, not one-to-one job elimination, which changes how “risk” should be interpreted. citeturn9view0turn12view4  

## Critiques and updates for creative occupations in the post-2022 generative AI era

### A pre-generative-AI critique: opening the “black box”

A prominent methodological critique is that Frey–Osborne’s modeled probabilities are difficult to scrutinize at the task level. entity["people","Philipp Brandes","computer scientist"] and entity["people","Roger Wattenhofer","computer scientist"] propose decomposing occupation probabilities into **task-level probabilities**, arguing that “every O*NET job consists of a set of tasks,” and that task-level analysis makes it easier to evaluate plausibility and identify “suspicious” results. citeturn57view0turn57view1

They also restate two key vulnerabilities: (a) the Frey–Osborne labeling involves subjective “eye-balling,” and (b) the whole approach hinges on the nine O*NET features chosen. citeturn57view1turn6view4turn6view5

### Post-2022: a shift from “automation probability” to “exposure to AI capabilities”

After the rapid diffusion of large language models and text-to-image systems, much of the best-known research stops trying to assign “P(job is automated)” and instead measures **task exposure**—how much of the task bundle overlaps with what models can do.

Two influential methodological lines:

1. **Occupation exposure indices tied to AI capabilities and O*NET descriptors.**  
   entity["people","Edward W. Felten","computer scientist"], entity["people","Manav Raj","economist"], and entity["people","Robert Seamans","economist"] adapt “AI Occupational Exposure” ideas to language modeling by building a score that links:  
   - **10 AI applications** (including language modeling and image generation)  
   - to **52 human abilities**  
   - using a crowd-sourced relatedness matrix, with human-ability weights taken from O*NET (prevalence and importance). citeturn32view0  

   They stress “exposure” is meant to be **agnostic** regarding whether AI substitutes for or augments work. citeturn32view2turn32view2  

2. **Rubric-based task exposure for LLMs, combining human expertise with LLM classification.**  
   entity["people","Tyna Eloundou","researcher"] and coauthors propose an occupation/task exposure rubric for large language models, integrating human expertise and GPT-4 classifications. Their abstract reports that roughly **80%** of the U.S. workforce could have **≥10%** of tasks affected, and ~**19%** could have **≥50%** of tasks affected. They also estimate that ~**15%** of tasks could be done faster with an LLM, rising to **47–56%** when LLM-powered software/tools are included, while explicitly declining to predict development/adoption timelines. citeturn36view0  

### What “creative work” looks like under these newer measures

A key implication for creative and artistic occupations is that the “creative intelligence bottleneck,” which helped drive very low Frey–Osborne probabilities for many arts jobs, is no longer a safe assumption for many *components* of creative work. This does **not** imply full automation of creative occupations, but it does imply that **creative execution tasks** (drafting text, generating images, producing music stems, etc.) are now often within the feasible capability envelope of generative systems.

This is visible in empirical labor-market evidence and creative production studies:

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["text-to-image generative AI artwork example","freelance writing platform jobs posting screenshot","dance rehearsal choreographer directing dancers","AI occupational exposure index O*NET"],"num_per_query":1}

- On entity["company","Upwork","freelance platform"], entity["people","Xiang Hui","economist"] and coauthors find that after the release of ChatGPT, freelancers in more affected occupations saw a **2%** decline in monthly jobs and a **5.2%** decline in monthly earnings, and they report qualitatively similar effects around releases of image-based generative models for image/design work. citeturn42view1turn42view0  
- entity["people","Ozge Demirci","business economist"] and coauthors, using job postings from a large online freelancing platform, report a **21%** decrease in job posts for “automation-prone” writing/coding jobs within eight months after ChatGPT’s introduction and a **17%** decrease in posts related to image creation following image-generating AI introductions. citeturn44view0  

At the same time, evidence on creative production emphasizes a **recomposition** of skills:

- entity["people","Eric Zhou","information systems researcher"] and entity["people","Dokyun Lee","information systems researcher"] study text-to-image AI adoption in an art-sharing context and report that text-to-image AI can raise measured creative productivity and peer-evaluated “value,” while also shifting novelty patterns—suggesting augmentation of production coupled with changes in the creative frontier and selection/filtering demands. citeturn58view0  
- entity["people","Uwe Messer","researcher"] reports experimental evidence that disclosure of AI co-creation can **reduce valuation** of artworks and artists, driven largely by perceived authenticity, with stronger negative effects when AI is used in implementation rather than idea generation. citeturn46view0  

Sector-level economic impact work also points to material revenue pressure in creative industries (even when not framed as “jobs automated”):

- entity["organization","CISAC","authors and composers confederation"]-commissioned work by entity["company","PMP Strategy","strategy consulting"] (executive summary) estimates that by 2028 **24% of music creators’ revenues** and **21% of audiovisual creators’ revenues** could be “at risk,” with large market-size projections for AI-generated outputs; it also notes the study does **not** focus on detailed job impacts, highlighting a gap between revenue displacement and employment measurement. citeturn49view0turn49view1  

### What this implies specifically for “Choreographers”

For choreographers, the original Frey–Osborne probability (0.4%) is tightly linked to strong “creative” and “social” attributes in O*NET and the assumption that these are durable bottlenecks. citeturn4view0turn6view4turn22view0

Post-2022 evidence suggests a more nuanced framing:

- **Higher exposure of some sub-tasks** than the 2013-era “creative bottleneck” logic would suggest (e.g., ideation assistance, music-to-motion prototyping, documentation, marketing copy). This is consistent with the broad LLM “task affected” findings and observed contraction in writing/image gigs. citeturn36view0turn44view0turn42view1  
- **Persistence of core embodied and interpersonal components** of choreography work: teaching/instructing, coordinating performers, and maintaining interpersonal relationships are central in the O*NET profile and align with the interpersonal bottlenecks emphasized in earlier frameworks. citeturn22view0turn6view4  

So, the best-supported update is not “choreographers are now high automation risk,” but rather that the **composition of work** is increasingly likely to be **partially automated and reorganized**, which is exactly the conceptual distinction task-based frameworks emphasize. citeturn38view0turn55view1turn10view0

## The GAO 2019 report and the citation chain from Frey & Osborne to GAO to downstream thesis use

### What the GAO report does with Frey & Osborne

The relevant GAO report is **GAO-19-257**, authored by the entity["organization","U.S. Government Accountability Office","federal audit agency"]. citeturn16view0

GAO uses Frey–Osborne probabilities as a **classification tool** for its descriptive analyses of employment trends and worker characteristics:

- GAO describes Frey–Osborne as “using a model that evaluates tasks within an occupation” to estimate probabilities for 702 occupations, with probabilities from 0 to 100%. citeturn17view1  
- GAO operationalizes “occupations susceptible to automation” as the **“high-risk” group**, defined as probability **greater than 0.7** (70%). citeturn17view1turn17view3  
- GAO’s sidebar explicitly repeats the choreographers example: it states that Frey and Osborne estimate “healthcare social workers and choreographers” at **0.4%**, contrasted with very high probabilities for jobs like telemarketers. citeturn17view1  

GAO also explicitly justifies using Frey–Osborne because it is “widely cited” and structured to identify a broad set of occupations to examine. citeturn17view1

### GAO also acknowledges the range of estimates and cites Arntz–Gregory–Zierahn

In a background section designed to contextualize uncertainty, GAO juxtaposes multiple studies:

- It reports the Frey–Osborne “47% of total U.S. employment” high-risk figure (over the next decade or two, i.e., by ~2030) in its summary of example studies. citeturn21view0  
- It also notes the Arntz–Gregory–Zierahn estimate of **9%** high-risk, attributing differences to the lower susceptibility of jobs requiring cooperating/influencing others, and explicitly states that their method uses PIAAC task data combined with Frey–Osborne-related work. citeturn20view0turn21view0  

### The citation chain and what it means for thesis writing

Because GAO is **not the originator** of the choreographer probability (or the 47% headline), the chain is:

- **Origin:** Frey & Osborne’s occupation probabilities (including “Choreographers = 0.004”). citeturn4view0turn8view0  
- **Secondary synthesis / operationalization:** GAO repeats those figures and uses them to define “jobs susceptible to automation” as probability > 0.7 for its analyses. citeturn17view1turn17view3turn21view0  
- **Downstream usage (thesis):** If a thesis cites GAO for the choreographers probability or for the “high-risk” threshold rule, then the **substantive empirical claim is ultimately Frey–Osborne’s**, while GAO is the **intermediate source** that repackages it for policy analysis. citeturn17view1turn21view0  

Practically, this means:

- If the thesis uses the **0.4% choreographers** number, the most transparent citation practice is to cite **Frey & Osborne (2013/2017)** as the primary empirical source (and optionally cite GAO for how the statistic is used in policy framing). citeturn4view0turn17view1  
- If the thesis uses GAO’s **“susceptible jobs” definition** (probability > 0.7), that operational definition should be attributed to **GAO’s analytic choice**, even though the underlying probabilities come from Frey–Osborne. citeturn17view3turn17view1  

## Implications for researchers using these estimates in 2026

The key methodological evolution since Frey–Osborne is that “automation risk” is no longer well captured by a single occupation-level probability—especially for creative work affected by generative models.

Three consensus-like takeaways emerge across the sources reviewed:

First, the Frey–Osborne probabilities should be read as **a feasibility-oriented, occupation-level model anchored in 2010-era task/skill descriptors and a specific bottleneck theory**, not as a direct forecast of job losses. GAO itself reinforces this uncertainty framing by emphasizing limits of existing data in linking employment trends to advanced technology adoption. citeturn8view0turn19view0turn17view0  

Second, task-based approaches consistently show that **within-occupation task heterogeneity matters**, lowering the share of jobs plausibly fully automated (as opposed to partially transformed). This is visible both in the Arntz–Gregory–Zierahn critique and in the way post-2022 generative AI work (ILO, Felten–Raj–Seamans, Eloundou et al.) frames impacts as exposure/augmentation rather than wholesale replacement. citeturn10view0turn12view4turn55view1turn38view0turn36view0turn32view2  

Third, for creative occupations specifically, post-2022 evidence supports a reframing from “low automation probability” to “mixed exposure with offsetting mechanisms”:

- measurable substitution pressure in some creative-adjacent markets (writing, image creation) in online labor platforms, citeturn44view0turn42view1  
- alongside evidence of productivity augmentation and changed valuation/authenticity dynamics in artistic production, citeturn58view0turn46view0  
- and sector-level projections of substantial revenue at risk absent policy/market adjustments. citeturn49view1  

For “Choreographers,” the strongest evidence-based update is therefore not a new “automation probability,” but an expectation of **task recomposition**—with generative systems affecting some supportive/production tasks, while embodied teaching, coordination, and interpersonal leadership remain central. citeturn22view0turn55view1turn38view0  

## References

Arntz, M., Gregory, T., & Zierahn, U. (2016). *The risk of automation for jobs in OECD countries: A comparative analysis* (OECD Social, Employment and Migration Working Papers No. 189). OECD Publishing. https://doi.org/10.1787/5jlz9h56dvq7-en

Brandes, P., & Wattenhofer, R. (2016). *Opening the Frey/Osborne black box: Which tasks of a job are susceptible to computerization?* arXiv. https://arxiv.org/abs/1604.08823

Demirci, O., Hannane, J., & Zhu, X. (2024). *Who is AI replacing? The impact of generative AI on online freelancing platforms* (Working paper). https://questromworld.bu.edu/platformstrategy/wp-content/uploads/sites/49/2024/06/PlatStrat2024_paper_119.pdf

Eloundou, T., Manning, S., Mishkin, P., & Rock, D. (2023). *GPTs are GPTs: An early look at the labor market impact potential of large language models* (arXiv:2303.10130). arXiv. https://doi.org/10.48550/arXiv.2303.10130

Felten, E. W., Raj, M., & Seamans, R. (2023). *How will language modelers like ChatGPT affect occupations and industries?* (arXiv:2303.01157). arXiv. https://doi.org/10.48550/arXiv.2303.01157

Frey, C. B., & Osborne, M. A. (2013). *The future of employment: How susceptible are jobs to computerisation?* (Working paper). Oxford Martin School, entity["organization","University of Oxford","university, oxford uk"]. https://www.oxfordmartin.ox.ac.uk/downloads/academic/The_Future_of_Employment.pdf

Frey, C. B., & Osborne, M. A. (2017). The future of employment: How susceptible are jobs to computerisation? *Technological Forecasting and Social Change, 114*, 254–280. https://doi.org/10.1016/j.techfore.2016.08.019

Gmyrek, P., Berg, J., & Bescond, D. (2023). *Generative AI and jobs: A global analysis of potential effects on job quantity and quality* (ILO Working Paper No. 96). International Labour Office. https://doi.org/10.54394/FHEM8239

Government Accountability Office. (2019). *Workforce automation: Better data needed to assess and plan for effects of advanced technologies on jobs* (GAO-19-257). Washington, DC: Author. https://www.gao.gov/assets/gao-19-257.pdf

Hui, X., Reshef, O., & Zhou, L. (2023). *The short-term effects of generative artificial intelligence on employment: Evidence from an online labor market* (CESifo Working Paper No. 10601). CESifo. https://www.ifo.de/DocDL/cesifo1_wp10601.pdf

International Labour Organization. (2025). *Generative AI and Jobs: A refined global index of occupational exposure* (ILO Working Paper No. 140). International Labour Office. https://doi.org/10.54394/HETP0387

Messer, U. (2024). Co-creating art with generative artificial intelligence: Implications for artworks and artists. *Computers in Human Behavior: Artificial Humans, 2*(1), 100056. https://doi.org/10.1016/j.chbah.2024.100056

O*NET OnLine. (n.d.). *Choreographers (27-2032.00)*. entity["organization","U.S. Department of Labor","federal labor dept"]. https://www.onetonline.org/link/summary/27-2032.00

PMP Strategy. (2024). *Study on the economic impact of Generative AI in the Music and Audiovisual industries: Executive summary* (Commissioned by CISAC). https://adepi.net/wp-content/uploads/2024/12/SG24-0864_Executive_Summary_Study_on_the_economic_impact_of_Generative_AI_in_Music_and_Audiovisual_industries_2024-11-20_EN.pdf

Zhou, E., & Lee, D. (2024). Generative artificial intelligence, human creativity, and art. *PNAS Nexus, 3*(3), pgae052. https://doi.org/10.1093/pnasnexus/pgae052
