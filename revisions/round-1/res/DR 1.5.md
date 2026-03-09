# Boden, Colton, and the Philosophical Stakes of AI Choreography

## Boden’s creativity framework and her stance on “genuine” machine creativity

Margaret Boden’s core proposal (developed most fully in *The Creative Mind* and reiterated with updated AI examples in *AI: Its Nature and Future*) is that creativity is not an ineffable “mystery faculty,” but an intelligible set of cognitive capacities that yield **ideas or artifacts that are new, surprising, and valuable**. Crucially, Boden argues that “new” and “surprising” are not single notions: both are multidimensional, and these dimensions map onto different computational mechanisms. citeturn15view0turn15view1turn13view0

### Psychological vs historical creativity

Boden’s well-known distinction between **P-creativity** (psychological creativity) and **H-creativity** (historical creativity) is central for computational creativity debates because it helps separate (i) *novelty relative to a producer’s prior state* from (ii) *novelty relative to human cultural history*. A creative act can be P-creative even if it is not historically unprecedented, and H-creativity is a special case of P-creativity. This distinction matters for AI because many current systems plausibly generate P-creative outputs (relative to their internal model state), while H-creative status requires a socio-historical claim about first occurrence and uptake. citeturn15view1turn13view0turn57view1

### The three types: combinational, exploratory, transformational

Boden’s best-known typology distinguishes three ways creative novelty arises:

**Combinational creativity** combines familiar ideas in unfamiliar ways (e.g., metaphor, collage, certain analogies), typically yielding “statistical surprise”—improbable but intelligible novelty. citeturn15view2turn13view0

**Exploratory creativity** searches the structured possibilities of a **conceptual space** (a culturally learned “style of thinking” with constraints and generative rules). Within such a space, one can generate many previously unthought possibilities by systematically exploring the space’s latent potential. citeturn15view3turn13view0

**Transformational creativity** changes the space itself by altering or replacing constraints so that new structures become possible—ideas that “could not have been generated before” and are often experienced as “impossible” or deeply surprising until a community comes to understand and assimilate them. citeturn13view1turn13view0

### Boden’s “Lovelace questions” and the status of “real” creativity

Boden treats entity["people","Ada Lovelace","19c computing pioneer"]’s classic remark about the entity["people","Charles Babbage","analytical engine designer"] “Analytical Engine” as a prompt to disentangle multiple questions that are often conflated. In *The Creative Mind*, she distinguishes at least four “Lovelace questions,” including whether computers can (i) help explain human creativity, (ii) produce outputs that *appear* creative, (iii) recognize creativity, and (iv) be *really* creative (as opposed to merely producing apparently creative output whose originality is “wholly due” to the programmer). Boden argues the first three are answerable as matters of scientific and engineering fact, while the “really creative” question quickly becomes a controversial metaphysical/moral debate. citeturn17view0turn17view1

That position is consistent with her later writing: in her AI Magazine overview, she explicitly frames “whether computers could ‘really’ be creative” as *not a scientific question but a philosophical one*, and emphasizes that it is “currently unanswerable” because it depends on contested issues about meaning/intentionality, consciousness, and moral community membership. citeturn57view2turn53view0

### Boden’s positive claim: AI can instantiate the mechanisms of creativity (especially exploratory)

Although Boden is careful about the metaphysical question, she is not skeptical about computational creativity as a research program. In her 2016 discussion of creativity (in the edition of her Oxford text consulted here), she argues that AI has already generated ideas that are historically new, surprising, and valuable in domains including engineering and computer art. She also insists that AI concepts help explain human creativity by clarifying the three mechanisms above. citeturn13view0turn57view0

At the same time, she makes two claims that are especially relevant for dance:

1. **Exploratory creativity is “best suited to AI.”** She gives the general rationale: many AI systems excel at exploring well-defined spaces, but transformational creativity is risky because rule-breaking requires evaluation—yet “fitness functions” and evaluation criteria are typically provided by humans and are not autonomously revised by current systems. citeturn13view2turn13view1

2. **For AI creativity to be “all its own work,” an AGI would need to analyze styles for itself.** Boden argues that even impressive exploratory creativity depends heavily on human analysts clarifying the style/space, and that having a general agent capable of independently analyzing styles is “a tall order.” citeturn13view2

## What “AI dance generation” currently is, technically and culturally

“AI dance generation” in the contemporary research sense is mainly **music-conditioned** or **text-and-music-conditioned** generation of human motion sequences, typically represented as 3D joint rotations/positions (or similar body models), sometimes including global translation and constraints for physical plausibility. The most relevant trend lines for your thesis are:

### From “music-to-motion” transformers to diffusion-based, editable choreography

A widely cited benchmark line is the **AIST++** ecosystem. The ICCV 2021 “AI Choreographer” work introduced **AIST++**, described as a multi-modal dataset pairing music with reconstructed 3D dance motion (hours of data, many sequences and genres), and proposed a cross-modal transformer (FACT) to generate long dance sequences conditioned on music. citeturn36view0turn36view1

By CVPR 2023, diffusion models entered dance generation more explicitly through **EDGE**, which frames dance generation as not only producing plausible dances but enabling **editing operations** (e.g., joint-wise conditioning, in-betweening) and argues that evaluation is unusually hard because “existing papers often use quantitative metrics that … are flawed.” citeturn46view0turn45view0

ICCV 2023 builds on the data side with **FineDance**, which argues that prior datasets underrepresent hand motion and genre granularity; it provides a larger motion-capture dataset with fine-grained genres and proposes models/metrics meant to improve genre-matching and expressiveness. citeturn46view1turn46view2turn45view1

### Evaluation pressure points already visible in the dance literature

The EDGE paper is unusually explicit that evaluation is “subjective and complex,” that dance plausibility interacts with domain-specific phenomena (e.g., foot contact realism vs stylistic sliding), and that human studies remain central for “quality” claims. citeturn45view0turn46view0

This matters philosophically because Boden’s definition of creativity includes **value**, and value is not a purely intrinsic property of an artifact but a judgment that depends on intelligibility, relevance, and social uptake. That dependence is explicit in her 2016 discussion of creativity and valuation disagreements. citeturn13view0turn13view2

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["motion capture dancer markers studio","3D human pose skeleton visualization dance","AIST++ dataset dance generation visualization","AI generated dance animation avatar"],"num_per_query":1}

## How Boden would likely categorize today’s AI dance generation

This section answers your questions (1) and (4) in the most thesis-usable form: mapping contemporary dance-generation systems onto Boden’s three mechanisms, and isolating what would be required for *transformational* choreography *in Boden’s sense*.

### Exploratory creativity as the default classification

Most current dance generators (transformers, diffusion models) are best understood as **exploring a data-driven conceptual space** whose constraints are derived from (i) training corpora (dance videos/mocap), (ii) representational choices (skeleton topology, joint limits, temporal sampling), and (iii) conditioning signals (music features, text prompts). This aligns directly with Boden’s characterization of exploratory creativity as exploiting a culturally valued way of thinking (a style/space) to generate new instances recognizable as “within” the style family. citeturn13view0turn15view3turn36view0turn46view0

In Boden’s own terms, AI is especially well-suited to exploratory creativity; she explicitly says there are “countless examples,” and (in the same discussion) lists choreography as a target domain of “computer-generated (CG) art.” citeturn13view2turn13view3

**So how would Boden classify systems like AI Choreographer (FACT/AIST++) or EDGE?** Based on her framework, the conservative and well-supported classification is:

- **Primarily exploratory**: the system generates novel sequences that remain legible as dance within established movement grammars and genre constraints learned from training data and embodied in the model representation. citeturn13view0turn36view0turn46view0

EDGE strengthens this classification because it emphasizes **editability** (constraints, in-betweening), which is an explicit way of navigating a space of acceptable dances rather than re-inventing the space’s rules. citeturn45view0turn46view0

### Combinational creativity: present, but not the main engine

Boden’s combinational creativity is not merely “mixing” in a statistical sense; it is combining familiar ideas in ways that remain mutually relevant and valued. In her 2016 writing, she even remarks that “hardly any” CG art is combinational, and gives a collage-like example requiring explicit instruction about “war” associations. citeturn13view3turn13view1

Applied to dance generation, *combinational* creativity would be most plausible when systems explicitly combine:

- movement vocabularies from distinct genres,
- choreographic motifs plus narrative/semantic constraints,
- or multi-agent relational structures (leader–follower, contact, mirroring) plus stylistic constraints,

in ways that dance communities recognize as meaningful rather than as noisy interpolation.

Some modern systems can *appear* combinational—for example by blending conditioning signals (music features + text prompts, or style tags + music)—but Boden’s worry about **relevance/value** suggests that much of what looks like “combination” is still exploratory search inside a learned joint embedding space unless the system has strong mechanisms for semantic and cultural relevance. citeturn13view1turn59view0turn46view2

### Can AI choreography be transformational in Boden’s sense?

Boden defines transformational creativity as altering constraints so that structures become possible that literally could not have been generated before within the prior space; these outputs are often initially unintelligible or “impossible,” yet must remain close enough to prior practices to eventually be understood and adopted. citeturn13view1turn13view0

From that definition, there are two distinct questions:

#### Transformational “inside the model” vs transformational “in dance history”

1. **Internal/technical transformation:** Has the system changed its generative constraints so that it can produce classes of dances not generable under the old constraint set?

2. **Socio-cultural transformation:** Has the output actually transformed the dance conceptual space *as practiced*, in the sense of introducing new constraints/possibilities that dancers adopt as a new style, genre, or choreographic logic?

Boden’s own discussion implies both levels matter: she stresses that transformational ideas are often unintelligible initially and require eventual intelligibility/acceptance, which is a social-historical phenomenon, not merely a parameter update. citeturn13view1turn15view3

#### Why most current dance generators fall short of transformational creativity (by Boden’s criteria)

Boden argues that transformational creativity is possible in AI in principle—especially via evolutionary mechanisms that “transform themselves”—but she adds a key limitation: evaluation criteria (“fitness functions”) are provided by humans and current AI cannot revise them independently; without evaluation, rule-breaking risks “chaos.” citeturn13view1turn13view2turn57view2

Dance-generation systems like EDGE are impressive at *constraint-based editing* and physical plausibility metrics, but the criteria for “good dance” remain largely external: curated datasets, human studies, and hand-designed or learned evaluation objectives still encode what counts as acceptable movement and alignment. citeturn45view0turn46view0turn59view0

So, under a Boden-style analysis, most current AI choreography is:

- **exploratory creativity with occasional transformational appearance** (deep surprise to viewers unfamiliar with the learned space),
- rather than **transformational creativity proper**, because the system is rarely re-engineering the conceptual space’s constraints in a way that is both (i) principled and (ii) culturally assimilated as a new dance logic. citeturn13view1turn13view2turn46view0

#### What would count as transformational AI choreography in Boden’s sense?

A careful Boden-compatible criterion set for “transformational AI choreography” would require evidence that the system:

- **Alters constraints at the level of choreographic representation**, not merely samples new sequences. For example, it would need to propose (and maintain) new movement primitives, segmentation, spatial logics, or coordination constraints such that entire classes of movement become generable that were not generable before. citeturn13view1turn15view3

- **Evaluates and stabilizes the transformation**, i.e., does not simply break rules but supplies (or learns) a way to **judge value**. Boden’s insistence on evaluation as a guard against chaos makes this non-optional. citeturn13view2turn59view0

- **Achieves intelligibility close enough for uptake**, meaning the new “space” becomes interpretable and usable by choreographers/dancers (or at least by a relevant dance community). This is the bridge from internal transformation to historically transformational creativity. citeturn13view1turn15view3

The strongest reading of your “embodied resistance” thesis can leverage this: even if a model can generate sequences that are statistically novel, “transformational choreography” in Boden’s sense is partly a **cultural and embodied achievement**, not only a generative one. citeturn13view1turn13view0

## Colton’s computational creativity and the problem of evaluating machine creativity

This section addresses question (2) directly and also provides a bridge between philosophical debate and technical evaluation methodology.

### The creative tripod: skill, appreciation, imagination

In “Creativity Versus the Perception of Creativity in Computational Systems,” Simon Colton argues that debates about machine creativity are shaped not only by what systems do, but by **how audiences attribute creativity**—often defaulting to crediting the programmer rather than the software. To address this, he proposes the **creative tripod**, whose three legs are:

- **Skill** (capacity to produce coherent artifacts),
- **Appreciation** (capacity to assess value—avoiding trivial or valueless outputs),
- **Imagination** (capacity to go beyond pastiche). citeturn22view0

Colton treats the tripod partly as a conceptual device for communicating system behavior and partly as an assessment framework: if a system is perceived as skillful, appreciative, and imaginative, then it should be considered creative; if it lacks any leg, creativity attribution is undermined. He also emphasizes that “creativity” may be distributed across programmer, program, and consumer, and the tripod can represent these differing contributions. citeturn22view0

### Painting Fool and DARCI as an autonomy-and-appreciation trajectory

Colton’s “Painting Fool” project is explicitly engineered toward being “taken seriously as a creative artist in its own right,” and its research trajectory is organized around increasing (i) technical capacity and (ii) social acceptance. In the ICCC 2015 account, the project integrates machine vision capabilities from **DARCI** to enhance analysis of its own work, increase “creative responsibility,” and improve “framing information” for audiences. citeturn25view0turn25view1

DARCI is itself framed as a “Digital ARtist Communicating Intention,” designed to explore the bounds of computational creativity in visual art and—importantly—to push autonomy by improving the system’s ability to **curate** outputs rather than rely on humans to select the valuable artifact from many candidates. citeturn28view0

From the standpoint of evaluation theory, the Painting Fool + DARCI pairing exemplifies a “generate-and-test” architecture: one module generates candidates; another evaluates/filters for value or intention-communication. A recent ACM Computing Surveys synthesis explicitly notes this as a canonical generate-and-test pattern, describing the Painting Fool’s use of DARCI as an evaluation function (an “artificial art critic”) to assess its own creations. citeturn59view0turn25view0

### FACE and IDEA: evaluating creative acts and impacts

Colton (with collaborators) also aims to systematize evaluation beyond artifact-based judgments. The **FACE** model (creative acts described as tuples of generative acts, including framing) and the **IDEA** model (impact on audiences/communities) were proposed as components of “computational creativity theory” intended to support cross-system comparison and evaluation at both process and reception levels. citeturn19search1turn19search0

These models are particularly useful for dance, because choreography is not merely an output string: it is a **performed act** that depends on framing, audience interpretation, and social embedding—precisely the dimensions IDEA tries to keep in view. citeturn19search1turn13view1

## The philosophical debate on AI creativity

This section addresses question (3): the current landscape of positions on whether AI can be “creative” in a philosophically meaningful sense, with representative proponents. The key point for your thesis is that the debate clusters around **what creativity is taken to require**—product properties, process properties, agency/intentionality, embodiment, or socio-cultural relations.

### Product-first (deflationary/functional) accounts: creativity as reliable novelty + value

A dominant strand in both computational creativity and some philosophical work treats creativity primarily as a property of outputs (or of output-producing capacities): if systems reliably generate novel and valuable artifacts, then creativity attribution is warranted in a thin sense.

Boden’s own operational definition (new/surprising/valuable) supports this direction, and she repeatedly insists that AI can instantiate the mechanisms of combinational, exploratory, and (in some cases) transformational creativity, even while metaphysical questions remain open. citeturn13view0turn57view0turn57view2

A very recent articulation comes from entity["people","James S. Pearson","philosopher"] and colleagues (preprint): they argue that many theorists impose an “Intentional Agency Condition” (IAC) requiring purposeful action for creativity, but that advances in generative AI make this requirement increasingly dysfunctional—leading them to propose a more product-first, consistency-based account of creativity, while allowing intentional agency to remain relevant in specific local domains. citeturn31view0turn31view1

### Process-first and agency-first accounts: creativity requires intention, understanding, or authenticity

Opposing views argue that creativity is not just novelty + value, but involves some form of agency (often intentional agency), understanding, authenticity, or lived experience.

A common philosophical anchor here is entity["people","John Searle","philosopher chinese room"]’s “Chinese Room” argument, typically invoked to challenge claims that symbol manipulation suffices for understanding (and by extension, for genuinely meaningful creativity). On this view, a system might produce outputs indistinguishable from understanding, yet lack the semantic/intentional states that would make its production genuinely creative rather than merely imitational. citeturn29search2turn29search6

Recent work often reframes the issue in terms of cognition and authenticity. entity["people","Matteo Da Pelo","philosophy of ai"] argues that generative AI systems can meet standard creativity criteria (novelty/usefulness) and can functionally reproduce stages of human creative processes, but that the absence of intentionality and authenticity limits attribution of “genuine creativity.” He proposes “artificial creativity” as a distinct category: non-cognitive, non-intentional, non-authentic generative mechanisms. citeturn34view0turn34view1

In the artistic authorship debate, entity["people","Aaron Hertzmann","computer graphics researcher"] offers a widely cited position: art authorship is bound up with social agency; historically, we credit humans (developers/users) rather than software with authorship, and meaningful “growth” and cultural responsiveness would be required for software to be treated as an artist in anything like the human sense. citeturn61view0

### Relational and socio-technical accounts: creativity as distributed performance or co-creation

A third family of positions avoids treating creativity attribution as a purely internalist matter (what the machine “has inside”) and instead focuses on **human–technology relations** and social practice.

entity["people","Mark Coeckelbergh","philosophy of technology"] argues that existing notions like instrument/extension are often inadequate for AI image generation; instead, we should analyze creative production as **processes and performances** in which roles and quasi-subjects emerge through socio-technical practice. Even if the system is not an “artist” in a robust agency sense, the creative act can be seen as a poietic performance involving humans and non-humans. citeturn60view0

For a thesis on embodied resistance, this approach is particularly relevant because it re-situates “creativity” in **practices of making and performing**, not merely in artifact production.

### Evaluation and testing proposals as practical philosophy

Some strands of the debate are best read as *operational philosophy*: proposals for how to test or compare creativity claims.

entity["people","Mark O. Riedl","ai researcher"]’s Lovelace 2.0 Test proposes creativity constraints as a way to test for intelligence, positioning it as an alternative to the Turing Test and as a method for comparing agents’ relative intelligence/creativity capacities. citeturn62view0

In computational creativity research, larger survey work emphasizes evaluation as multi-dimensional (novelty, value, surprise, framing, impact) and highlights generate-and-test paradigms (including Painting Fool + DARCI) as ways to formalize aspects of appreciation and selection. citeturn59view0turn59view1

## Re-applying Boden to dance: a thesis-oriented synthesis

This final section returns to your dissertation topic—**embodied resistance of dance to AI automation**—by extracting the most defensible Boden-style claims about what AI dance generation can and cannot be, and by clarifying what “transformational choreography” would mean in this context.

### Dance as a conceptual space, and what AI learns when it learns dance

Boden’s concept of a **conceptual space** is unusually apt for dance because dance genres are, in practice, structured spaces of possibilities: vocabularies of steps and transitions, dynamics, rhythmic relations, spatial pathways, stylistic constraints (including socially policed constraints), and tacit evaluative norms.

Current AI dance systems instantiate a computational analogue of this by building a generative model over motion representations learned from datasets such as AIST++ and FineDance, with explicit conditioning on music features and explicit metrics for alignment/physical plausibility. citeturn36view0turn46view1turn46view0

Under Boden’s taxonomy, this is paradigmatically **exploratory**: it discovers and samples from “what is possible” in the learned space in ways that remain recognizable as dance in the relevant family. citeturn13view0turn15view3turn45view0

### Why “transformational dance” is especially hard for AI

On Boden’s account, transformation is not just deviation. It is **constraint change** that yields previously impossible structures, coupled with subsequent intelligibility/uptake. citeturn13view1turn13view0

Dance makes the evaluation problem more acute than in many symbolic domains because:

- “Value” is distributed across embodied performance quality, kinesthetic intelligibility, cultural meaning, and community reception, and
- choreographic “rules” are partly tacit, learned through embodied training and social participation rather than explicit formal statements.

Boden’s warning that evaluation criteria are typically supplied by humans, and that current AI cannot autonomously revise these criteria, therefore bites hard in choreography. Even if a model generates a “deeply surprising” motion sequence, determining whether it is a valuable transformation rather than incoherent noise is inseparable from embodied interpretation and social uptake. citeturn13view2turn13view1turn45view0

### A defensible Boden-style conclusion for your thesis

A Boden-consistent thesis claim (tight enough for doctoral use) would be:

1. **Most contemporary AI dance generation is exploratory creativity in a learned conceptual space**, sometimes augmented by constraint-based editing and selection mechanisms, and occasionally producing outputs that audiences experience as surprising. citeturn13view2turn36view0turn46view0

2. **Transformational choreography “in Boden’s sense” is not ruled out in principle**, but it would require the system to (a) revise constraints, (b) evaluate and stabilize revisions, and (c) achieve intelligibility and uptake in a dance community—none of which is reliably achieved by present systems whose evaluative norms are largely externally provided. citeturn13view1turn13view2turn59view1

3. Therefore, **dance’s embodied resistance to automation** can be argued (within Boden’s framework) not simply as “AI can’t generate movement,” but as: *the loci of transformational creativity in dance are bound up with embodied evaluation, cultural intelligibility, and social adoption*, making them difficult to automate even when exploratory generation is technically strong. citeturn13view1turn13view2turn60view0

## References

Boden, M. A. (2004). The Creative Mind: Myths and Mechanisms (2nd ed.). Routledge. citeturn15view0turn15view1turn17view0

Boden, M. A. (2009). Computer Models of Creativity. AI Magazine, 30(3), 23–34. citeturn57view0turn57view2turn53view0

Boden, M. A. (2016). AI: Its Nature and Future. Oxford University Press. citeturn13view0turn13view2turn13view3

Coeckelbergh, M. (2023). The Work of Art in the Age of AI Image Generation: Aesthetics and Human-Technology Relations as Process and Performance. Journal of Human-Technology Relations, 1. https://doi.org/10.59490/jhtr.2023.1.7025 citeturn60view0

Colton, S. (2008). Creativity Versus the Perception of Creativity in Computational Systems. In Proceedings of the AAAI Spring Symposium: Creative Intelligent Systems. citeturn21view0turn22view0

Colton, S., Charnley, J., & Pease, A. (2011). Computational Creativity Theory: The FACE and IDEA Descriptive Models. In Proceedings of the 2nd International Conference on Computational Creativity (ICCC). citeturn19search1

Colton, S., Halskov, J., Ventura, D., Gouldstone, I., Cook, M., & Pérez-Ferrer, B. (2015). The Painting Fool Sees! New Projects with the Automated Painter. In Proceedings of the 6th International Conference on Computational Creativity (ICCC). citeturn24view0turn25view0

Da Pelo, M. (2025). Artificial creativity: can there be creativity without cognition? AI & SOCIETY. https://doi.org/10.1007/s00146-025-02682-3 citeturn34view0turn33view0

Franceschelli, G., & Musolesi, M. (2024). Creativity and Machine Learning: A Survey. ACM Computing Surveys. citeturn59view0turn59view1turn58view0

Hertzmann, A. (2018). Can Computers Create Art? Arts, 7(2), 18. https://doi.org/10.3390/arts7020018 citeturn61view0

Li, R., Yang, S., Ross, D. A., & Kanazawa, A. (2021). AI Choreographer: Music Conditioned 3D Dance Generation with AIST++. In Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV). citeturn36view0turn35view0

Li, R., Zhao, J., Zhang, Y., Su, M., Ren, Z., Zhang, H., Tang, Y., & Li, X. (2023). FineDance: A Fine-grained Choreography Dataset for 3D Full Body Dance Generation. In Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV). citeturn46view1turn45view1

Norton, D., Heath, D., & Ventura, D. (2014). Autonomously Managing Competing Objectives to Improve the Creation and Curation of Artifacts. In Proceedings of the International Conference on Computational Creativity (ICCC). citeturn28view0turn27view0

Pearson, J. S., Dennis, M. J., & Cheong, M. (2026). Creativity in the Age of AI: Rethinking the Role of Intentional Agency (Preprint). arXiv. citeturn31view0turn30view0

Riedl, M. O. (2014). The Lovelace 2.0 Test of Artificial Creativity and Intelligence. arXiv. https://doi.org/10.48550/arXiv.1410.6142 citeturn62view0

Searle, J. (1980). Minds, Brains, and Programs. Behavioral and Brain Sciences, 3(3), 417–424. (For overview/discussion, see Stanford Encyclopedia of Philosophy entry “Chinese Room Argument.”) citeturn29search2

Tseng, J., Castellon, R., & Liu, C. K. (2023). EDGE: Editable Dance Generation From Music. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). citeturn46view0turn45view0
