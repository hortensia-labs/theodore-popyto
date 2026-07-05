# Beyond Correction: Algorithmic Mediation, Embodied Feedback, and the Pedagogical Ecologies of Care in Dance Training

**Abstract**  
In dance training, feedback is often framed as the correction of visible movement form. This article argues that such a framing is insufficient: feedback in dance is also, and irreducibly, a practice of embodied care. Drawing on phenomenology, enactivism, and the ethics of care, the article develops the concept of *pedagogical ecologies of care* to describe the material, relational, and digital conditions shaping how dancers are guided, sustained, and exposed to risk. To ground this theoretical proposition, the article presents a small-scale qualitative case study in a higher-education dance context. Student self-observation, AI-based pose analysis (MediaPipe), and pedagogical interpretation are juxtaposed to contrast three different regimes of knowing movement on the same choreographic phrase. The findings highlight the importance of contextual and relational knowledge: while AI provides a detailed descriptive layer of visible morphology, it does not infer intention, lived sensation, or affective state. The article contends that a more important question than whether AI can automate dimensions of feedback is what kind of environments we are constructing for vulnerable, labouring bodies—and how digital tools might be integrated without eroding the relational foundations of caring guidance.

**Keywords:** pedagogical ecologies of care; embodied feedback; dance pedagogy; ethics of care; artificial intelligence; MediaPipe; phenomenology; qualitative case study

## 1. Introduction

When a dance teacher tells a student to lift her sternum, the instruction appears simple: a correction of visible form. But the same words, addressed to a dancer recovering from a thoracic injury, carry an entirely different weight. They may provoke fear, reawaken pain, or demand a complex negotiation between the teacher’s expectation and the body’s present capacity. The difference between these two situations is not a matter of visual information—the postural deviation is identical—but of care: attention to history, sensitivity to vulnerability, and the ethical discernment to know what a body can bear.

This article examines this difference amid the growing integration of artificial intelligence into dance practice. Algorithmic tools like pose estimation promise objective, scalable feedback by tracking movement with unprecedented consistency. Yet this framing risks reducing feedback to the mere technical detection of deviation. In dance, however, feedback remains an embodied, relational, and ethically situated practice of caring guidance.

To describe the structured conditions through which that guidance takes place, I develop the concept of the *pedagogical ecology of care*. This term refers to the material, relational, pedagogical, and technological conditions that determine how a body is received, guided, sustained, and exposed to risk within training. A studio floor, a pedagogical relationship, an institutional culture, and a digital interface all participate in such an ecology. Each may be organised toward care—or toward discipline, optimisation, and control.

To ground this argument, the article presents a qualitative case study within a higher-education dance programme. A choreographic phrase performed by 18 students is analysed across three feedback layers: self-observation, AI-based description (MediaPipe), and pedagogical interpretation (combining teacher-researcher and external control readings). This serves not as statistical proof, but as an analytical scene illuminating underlying epistemic and pedagogical problems.

The article makes three contributions. Conceptually, it argues that feedback in dance is not reducible to correction or optimisation, but must be understood as a relational, situated, embodied, and ethical practice of care. Analytically, it proposes a heuristic distinction between descriptive, comparative, and prescriptive registers of AI-mediated movement observation, situating MediaPipe primarily within the descriptive layer. Methodologically, it shows that self-observation, computational description, and pedagogical interpretation are not interchangeable sources of validation, but distinct epistemic formations with different affordances and limits. What the case ultimately suggests is not that AI is useless for dance, but that pedagogical interpretation cannot be fully translated into visible metrics.

## 2. Conceptual and Theoretical Framework

### 2.1 The Body That Knows

Any serious account of dance feedback must begin with the body. Computational analysis usually presupposes the body-as-form: a measurable configuration of joints available for normative comparison. Phenomenology contests this, insisting the body is not primarily an object, but the condition of perception and action. Scholarship across dance, somatics, and HCI increasingly rejects mechanistic computational models for embodied frameworks (Brodie & Lobel, 2012; Dourish, 2001; Fdili Alaoui et al., 2014, 2015; Fortin et al., 2002; Leach & deLahunta, 2017; Schiphorst, 2011; Whatley & Blades, 2019).

Merleau-Ponty (1945/2012) argued the lived body—the *corps vécu*—is irreducible to objective anatomy. The dancing body is not a machine, but a site of intelligence and ongoing worldly negotiation. Consciousness is distributed through posture, muscular tension, and the pre-reflective awareness Gallagher (2005) terms the body schema. When adjusting mid-phrase, a dancer relies on sedimented experience beneath reflective thought.

Sheets-Johnstone (2011) extended this insight by showing that kinesthetic experience—the felt sense of one’s body moving through space—constitutes a form of knowledge that cannot be translated without remainder into visual description or numerical representation. Enactivism reinforces this point: cognition is not detached computation but the active bringing-forth of a world through embodied engagement (Noë, 2004; Varela, Thompson, & Rosch, 1991). What the dancer knows, she knows by doing.

This creates a structural asymmetry between the knowledge possessed by the dancer and the knowledge captured by an external algorithmic system. Both are real, but they are not commensurable. The gap between them is not merely a technical deficit to be solved by better sensors; it is an epistemological condition rooted in the difference between first-person lived experience and third-person spatial observation (Fdili Alaoui et al., 2015).

### 2.2 Feedback, Correction, and Caring Guidance

In dance, feedback is often treated as synonymous with correction: the teacher detects a deviation from desired form and directs the student’s attention toward it. Technical feedback on alignment, timing, and orientation remains indispensable. What this article contests is the sufficiency of correction as a model of what feedback actually is.

Joan Tronto’s (1993) ethics of care helps articulate this difference. Tronto identifies care as involving attentiveness, responsibility, competence, and responsiveness. Applied to dance pedagogy, this means that feedback is not merely informational. The caring teacher must notice signs of strain that may not be verbally expressed, judge when to push and when to protect, and calibrate intervention according to the student’s physical and emotional state.

Noddings (1984/2013) adds a phenomenological dimension through *engrossment*: displacing one’s own frame of reference to attentively receive another’s experience. The caring teacher registers the effort behind the form and the vulnerability beneath the visible action. As Green (2003) showed, dance training can easily drift into disciplinary regimes of relentless correction. Care-oriented pedagogy does not abandon standards, but refuses to pursue them at the expense of health or dignity. This distinction is not an absolute binary; care and correction exist on a continuum. As Foucauldian analyses of pastoral power remind us, care itself can become surveillant. Pedagogical guidance requires ongoing ethical vigilance rather than a naïve assumption of benevolence.

### 2.3 Three Registers of Algorithmic Mediation

To evaluate AI with precision, this article distinguishes three registers of algorithmic mediation. This heuristic intersects with established educational frameworks (e.g., Hattie & Timperley, 2007), but specifically addresses the structural problem of how computational systems access the body. While analytically distinct, these registers are empirically porous.

1. **Descriptive tools** generate spatial descriptions of the body. Pose estimation systems like MediaPipe map joint positions and angles. Used cautiously, they reveal compensatory patterns before injury occurs (Lugaresi et al., 2019; Wade et al., 2022).
2. **Comparative tools** evaluate movement against a normative baseline. Ethical complexity increases here, as standards are never neutral and may pathologise variation, reinforcing disciplinary norms (Salazar Sutil, 2015).
3. **Prescriptive tools** detect deviations and autonomously issue corrections. Here, the tension with care becomes acute, as the system identifies an “error” without grasping fatigue, fear, or intention.

The following case study engages primarily with the descriptive register, mapping its usefulness while exploring the boundary where computational description ends and pedagogical interpretation must begin.

### 2.4 Pedagogical Ecologies of Care

I define a *pedagogical ecology of care* as a structured configuration of material, relational, and technological conditions that determines how vulnerable bodies are received and guided within practice. Unlike *relational pedagogy*, which often centres on interpersonal exchange, or broader notions of *learning ecologies*, which emphasise networks of resources and environments, a pedagogical ecology of care foregrounds the specific ways bodily vulnerability is perceived, interpreted, and managed within training. Likewise, while Noddings’s “caring classrooms” and related ethics-of-care approaches often emphasise the moral orientation of the educator, the framework proposed here insists on care as a systemic configuration rather than solely an interpersonal disposition. Care emerges through the interdependence of studio arrangements, relational dynamics, interpretive practices, and technological mediations. In this sense, care is not merely an ethical attitude or a general atmosphere, but an infrastructural reality.

The *material* dimension encompasses the physical conditions of training: floor quality, room temperature, rest spaces, and the bodily risks these conditions amplify or reduce. The *relational* dimension encompasses pedagogical bonds and institutional cultures. The *digital* dimension concerns the way AI-mediated tools reshape what is observed, valued, and responded to. Crawford (2021) and Zuboff (2019) have shown that algorithmic observation tends structurally toward quantification and behavioural prediction. If care depends on responsiveness to what is not fully measurable, then uncritical data-driven feedback risks eroding the very conditions that make pedagogical care possible.

While not intended as a rigid checklist, provisional indicators help distinguish ecologies oriented toward care from those oriented toward control or optimisation. Specifically, an ecology of care actively incorporates rather than brackets bodily history; it reads deviation as a necessary process of exploration rather than merely as an error to be penalised; it ensures that vulnerability and fear can be expressed without penalty; it cultivates dialogical rather than unidirectional feedback; and it supports situated adjustment over the imposition of normative optimisation.

## 3. Methodology

The empirical component is a theoretically informed, small-scale qualitative case study conducted within a higher-education dance programme at the Instituto Universitario de Danza Alicia Alonso (Universidad Rey Juan Carlos, Spain). Not designed for statistical generalisation, it instead draws on instrumental and exemplary case-study traditions (Stake, 1995; Flyvbjerg, 2006) to serve as a bounded site for examining tensions between self-observation, computational description, and pedagogical interpretation.

### 3.1 Positionality and Reflexivity

The author occupied a dual role as module instructor and primary investigator. This convergence offered privileged pedagogical access to participants’ physical histories, vulnerabilities, and studio conditions, but also introduced methodological risks: confirmation bias, over-identification with the teacher-researcher interpretation layer (Layer 3A), and reduced independence across analytical layers. The concentration of interpretive roles in the teacher-researcher remains a real limitation of this qualitative design. To mitigate this vulnerability, the study maintained a structural separation of the knowledge regimes during data collection, preventing the algorithmic layer from rewriting the initial pedagogical observations. Furthermore, the design incorporated an external pedagogical control reading (Layer 3B). While Layer 3B does not eliminate the limitation of the dual role, it introduces a necessary external interpretive friction that partially reduces the study's vulnerability. The analysis therefore proceeded with interpretive caution, using divergences between student, algorithmic, and external observer layers as checks against the teacher’s assumptions, and repeatedly returning to the primary qualitative materials to anchor claims.

### 3.2 Participants, Movement Material, and Capture

Participants were undergraduate students enrolled in a contemporary dance module. All provided informed consent for video recording and anonymised use of responses in accordance with URJC ethical protocols. The corpus comprised 54 valid observation iterations across 18 participants (S1–S18), with three repetitions per participant.

The movement material consisted of a short contemporary choreographic phrase including technical demands, level changes, and moments of risk negotiation. Recordings took place in the studio immediately after technical class, ensuring participants were physically prepared for execution. A fixed frontal wide shot was used to capture the full phrase. Although a general starting position was maintained, small spatial differences inevitably emerged as dancers travelled through the sequence.

For analytical clarity, the phrase was segmented into three parts labelled according to their most recognisable movement nuclei: *pirouette* (turn), *ponché* (forward tilt), and *rondé* (leg circle). This naming functioned as a descriptive heuristic rather than a claim that the phrase belonged to a classical idiom.

### 3.3 Study Design: Analytical Juxtaposition of Knowledge Regimes

The study compares three distinct ways of knowing movement across identical segments.

**Layer 1: Student Self-Observation.** After watching their recordings, students completed a questionnaire assessing execution, discrepancies between felt and visible movement, moments of tension, and their feedback needs. This captures the lived, subjective experience of repetition.

**Layer 2: AI-Based Descriptive Analysis.** Segmented clips were processed with Google’s MediaPipe Pose Landmarker, extracting 33 body landmarks per frame to describe posture, stability, joint angles, and symmetry. No automated exclusion of low-confidence frames was applied; optical occlusions inherent in monocular tracking were retained as an epistemic limitation rather than a removable defect (Colyer et al., 2018; Seethapathi et al., 2019). This layer remained strictly descriptive.

To synthesise the raw numerical output into a readable report, the author employed an explicitly constrained, prompt-based large language model (LLM) procedure. Methodologically, relying on an LLM to synthesise outputs introduces a reflexive tension: the article critiques algorithmic mediation while concurrently employing its linguistic capacities. However, this tension was methodologically managed rather than ignored. The LLM was used in a tightly bounded, non-autonomous, non-pedagogical capacity solely to structure descriptive data; it held no interpretive authority. Working from the MediaPipe numerical outputs and annotated preview frames, it was issued a one-shot prompt designed to constrain interpretive overreach. It was explicitly instructed not to invent data, not to treat MediaPipe as a pedagogical evaluator, not to infer confidence, fear, pain, or intention unless supported elsewhere, and not to treat angular change by itself as sufficient evidence of improvement. The author manually verified the numerical references against the original CSV files and remained the sole final interpreter of the analytical structure.

**Layer 3: Pedagogical Interpretation.** This layer comprises two components.

- **Layer 3A: Teacher-Researcher Interpretation.** The teacher-researcher completed detailed observation protocols for each repetition, contextualising visible deviations against participants’ bodily histories, fatigue, visible confidence or anxiety, and the pedagogical aims of the exercise.
- **Layer 3B: External Pedagogical Control Reading.** An independent reviewer—a full professor of contemporary dance technique with over fifteen years of experience, external to the institution and with no prior knowledge of the students—applied the same observation protocol to a random subsample of 6 of the 18 participants. The reviewer had no prior access to the teacher-researcher’s observations (Layer 3A) or the students' self-observations (Layer 1). This bounded control reading was not designed to establish formal inter-rater reliability or to duplicate the entire 18-participant dataset, but to introduce a strategic point of external pedagogical friction.

Rather than classical triangulation aimed at discovering a single objective truth, the study relied on a layered analytical juxtaposition. Its central question was: what epistemic tensions emerge when we contrast student autoperception, pedagogical interpretations, and MediaPipe's descriptive capacity regarding iterative movement adjustment? The goal was to map the structural gaps between mathematical coordination, lived sensation, and pedagogical judgement.

### 3.4 Qualitative Analytical Procedure

The analytical procedure was interpretive, phenomenologically informed, and analytically comparative. First, a qualitative reading was performed independently on each layer: questionnaires were reviewed for recurring patterns of insecurity, self-correction, and discrepancies between felt and visible movement; MediaPipe outputs were synthesised into morphological descriptions of stability, angular fluctuation, and asymmetry; teacher-researcher logs were grouped to identify how visible deviations were weighed against contextual or emotional factors; and the external control reading was examined to assess whether the teacher-researcher's main tendencies remained broadly compatible under independent expert observation.

Second, these readings were juxtaposed to identify convergences, productive divergences, and complementarities. This was not a formal reliability procedure but a bounded qualitative comparison appropriate for a situated case study. The excerpts and patterns discussed hereafter are analytically representative of the convergences and divergences identified across the full 18-participant corpus.

## 4. Findings and Analysis

A transversal reading across layers reveals consistent patterns regarding improvement, technical error, and pedagogical care. Rather than merely confirming a theoretical distinction between objective data and lived experience, the case exposed situated mismatches not deducible in advance. It foregrounded compensatory patterns computationally detectable yet subjectively integrated, hidden inter-repetition variability, and divergences between geometric and lived perceptions of improvement.

### 4.1 Convergences: Feedback Exceeds Visible Form

Across all regimes, movement defied reduction to its formal surface. In the **student layer**, participants highlighted affective and cognitive states shaping their execution. One student wrote: “Somehow I want to find security in the movement, trying to control it with the mind.” Another noted that pedagogical pressure hindered movement before any geometric error emerged: “I am always afraid of the way they are going to correct me, and I focus on the fact that I am going to make a mistake, rather than on dancing.”

In the **teacher layer**, pedagogical interpretation corroborated this depth. Visible deviation rarely translated into immediate correction without contextual mediation. The logs frequently explained execution via physical and emotional factors, noting when a student “thinks more about the movement that follows,” suffers from an “excess of thinking,” or masks effort fearing a “loss of control.”

In the **MediaPipe layer**, the limitation of visible data became apparent by contrast. While MediaPipe documented high-resolution structural detail—e.g., Subject S2’s stable *pirouette* axis (Trunk Tilt Standard Deviation 1.5º–3.2º)—it could not reveal if this stability stemmed from relaxed flow or anxious bracing. The layers converge: visible morphology does not exhaust pedagogical meaning.

### 4.2 Divergences: Feeling versus Seeing

A productive divergence emerged between computational rendering and phenomenological experience. Students reported fatigue, pain, and hesitation that did not manifest visually—or saw rigidity they had not felt. One student articulated this dissonance: “I look very stiff; you don’t see a fluid movement in the video, which is something I didn’t think was a defect of mine.” Conversely, MediaPipe detected highly variable preparations and asymmetrical compensations that students felt as unified motion.

“Improvement” therefore carried structurally different meanings across regimes. For the **algorithm**, improvement was primarily geometric: less angular deviation. For the **student**, improvement meant shifts in lived experience: feeling safer, understanding the phrase better, or experiencing less anxiety. For the **teacher**, improvement involved a synthesis of nervous-system regulation, physical presence, and the integration of precision with release.

This difference appears clearly in the *ponché*. MediaPipe flagged substantial variability between Subject S4’s first and third repetitions, detecting a truncated movement initially (Trunk Std 5.3º; knees bent at 157º) and fuller articulation later (Trunk Std >43º; knee bent <18º). Yet the system cannot determine whether the early version reflected misunderstanding, conservation of energy, or fear of the floor. The teacher’s layer, by contrast, reads the body relationally as a state rather than merely an optical shape.

### 4.3 Non-trivial Findings across Movement Categories

MediaPipe proved analytically productive by exposing structural realities that complicated visible interpretation.

- During the **pirouette**, MediaPipe tracked a notably stable vertical axis (Trunk Tilt Std persistently below 3.5º) while registering diverse lower-body preparation strategies. Visual stability actively concealed asymmetrical biomechanical effort below the waist—an effort intensely felt by dancers but absorbed by the turn’s smoothness.
- During the **ponché**, the algorithm exposed maximum systemic variability, documenting bodies renegotiating the thoracic arch. Deep angular fluctuations in the torso compensated for limited hip mobility. Students did not register this as a “technical error,” but as a negotiation with gravity.
- During the **rondé**, MediaPipe recorded extreme asymmetrical arm elevations preserving the centre of mass without breaking form. What the algorithm flagged as extreme deviation, the teacher interpreted as necessary physical adaptation to save balance.

Here MediaPipe functions as epistemic friction: it makes structural adaptations visible below the threshold of real-time human perception, thereby complicating what “correctness” means when geometric regularity conflicts with physical resilience.

### 4.4 The External Control Reading (Layer 3B): Convergences and Divergences

The strategic inclusion of a bounded external control reading (Layer 3B) conducted on a 6-participant subsample provided vital pedagogical friction. Rather than simply confirming Layer 3A, this reading broadly supported the main diagnostic tendencies while clarifying the precise limits of an external gaze.

Crucially, the external reviewer converged with the teacher-researcher in recognising that visual form does not exhaust the pedagogical reality of the movement. The reviewer noted that improvement across the three repetitions was often driven by progressive familiarisation rather than the correction of discrete technical errors, observing in one case that "the upper trunk organises much better in the third [repetition], as if the body had found its internal logic." Likewise, the external reading converged in identifying the necessity of combining correction and accompaniment as the dominant pedagogical response.

However, divergences emerged due to the external reviewer's lack of relational history. Without access to participants' physical or emotional backgrounds, the external reviewer assigned greater interpretive weight to visible technical form and anticipated less coincidence with students' self-observations. The reviewer explicitly confronted this limitation: "there is something contained that I don't know if it is technical or emotional... without knowing the student it is difficult to distinguish it." Acknowledging that early attempts involved "more decoding than dancing," the reviewer recognised that "from the outside one sees the form, but intuits there is a layer of internal processing that is not visible." Thus, Layer 3B corroborates the core findings while demonstrating that although an expert external gaze captures form accurately, situated pedagogical knowledge remains essential for interpreting the affective dimensions of training.

### 4.5 Support over Control: The Need for Situated Care

When reviewing their videos, students often asked not simply for technical clarity but for *situated support*: reassurance, tailored commentary, and security. In parallel, the teacher found the most effective feedback consistently combined “correction and accompaniment.”

Deploying MediaPipe autonomously in a prescriptive register—flashing an “error” alert for excessive trunk tilt—would risk producing an ecology of control. It bypasses the teacher’s recognition of a student safely exploring range, managing fatigue, or negotiating vulnerability. Support emerges precisely where technical information is contextualised by ethical competence.

## 5. Discussion

### 5.1 AI as Descriptive Support, Not Autonomous Judgement

Here, AI analysis proved valuable only when kept strictly descriptive. MediaPipe mapped a morphological footprint, revealing mismatches between computational regularity and embodied ease. 

Yet descriptive accuracy is not pedagogical adequacy. Identifying postural deviation or angular variance provides optical data, not pedagogical feedback. Knowing a shoulder dropped five degrees means nothing until pedagogical judgement determines whether it signals healthy release, stylistic choice, or exhaustion.

### 5.2 The Epistemological Limits of Landmark-Based Observation

The divergence between algorithmic tracking and lived experience highlights a fundamental epistemological limit, consistent with critiques of computer vision in movement science (Seethapathi et al., 2019). Skeletal landmark models flatten the *kinesthetic tonality* of movement. They track coordinate geometries but not muscular torque, anticipatory tension, or the internal negotiation of effort.

When students reported a “paralyzing fear of making a mistake,” they named realities that significantly structured their movement but remained invisible to the optical sensor. This study empirically examines a descriptive pose-estimation system, rather than the full range of emerging multimodal architectures or affective computing frameworks (Picard, 1997; El Raheb et al., 2019). Consequently, it does not empirically test the strongest possible technological counterexample. However, the core argument is not a circular claim that because MediaPipe cannot infer affect, AI broadly cannot support pedagogy. Rather, the deeper claim concerns the structural difference between computational state-capture and situated pedagogical judgement. Even if richer sensing systems become technically more sophisticated at estimating affective or physiological states, the fundamental epistemological tension remains. Pedagogical care is not merely the increasingly accurate detection of a state, but the ethically responsible, relationally grounded decision of how, when, and whether to intervene.

### 5.3 Relational and Contextual Care: The Interpretation Layer

The interpretive layer shows how relational knowledge transforms visible geometric data. The caring teacher cross-references deviation against bodily history, current state, and pedagogical trajectory. A failed *ponché* on the first attempt may not be an error to penalise but a cautious act of self-preservation. Caring guidance sometimes requires not intensifying correction but deliberately withholding it in order to protect fragile confidence and allow the body to negotiate its own safe adjustment.

### 5.4 Pedagogical Ecologies in the Digital Age

Digital tools' ethical valence depends on their relational architecture. Using computer vision to automate assessment or impose standardisation risks subordinating pedagogical care to surveillance and optimisation. However, when positioned collaboratively as a descriptive aid provoking dialogue about sensation and form, AI integrates safely into a critically aware ecology of support.

### 5.5 Limitations of the Study

This deliberately bounded, small-scale qualitative case study is not intended for statistical generalisation. It centres on a single technology within a specific pedagogical context, limiting immediate transferability. Furthermore, the case is embedded in a higher-education dance setting characterised by relatively close, individualised pedagogical attention; findings regarding the limitations of AI feedback may not transfer directly to large-group, resource-constrained, or commercial contexts where human guidance is structurally scarce. Methodologically, while Layer 3B mitigated vulnerability associated with the author’s dual role, the study did not employ full independent validation, member checking, or formal inter-rater procedures. The LLM synthesis likewise functioned only as a constrained interpretive step. These limitations do not diminish the case’s analytical value; they clarify its scale and qualitative ambition.

## 6. Conclusion

Feedback in dance operates beyond the register of correction alone. Alongside the identification of formal deviations lies an irreducible ethical practice: caring guidance. This demands attentiveness to vulnerability, bodily history, fatigue, fear, and the pedagogical discernment to tailor intervention to what a specific body can bear in a specific moment.

Our case study empirically grounds this. While algorithms capture structural geometries precisely, they remain severed from the performing body's lived, affective realities. The *pedagogical ecology of care* evaluates whether training environments sustain or erode this relational practice. Substituting pedagogical judgement with algorithmic description risks replacing care with control.

The central concern, then, is not whether AI can automate dimensions of pedagogical feedback, but what kinds of environments we are building for bodies that labour, tire, hurt, and heal. The ethical challenge is to design ecologies of care in which digital tools genuinely support situated flourishing, rather than reducing the unmeasurable dimensions of embodied life to data.

## References

Brodie, J. A., & Lobel, E. E. (2012). *Dance and Somatics: Mind-Body Principles of Teaching and Performance*. McFarland.

Colyer, S. L., Evans, M., Cosker, D. P., & Salo, A. I. (2018). A review of the evolution of vision-based motion analysis and the integration of advanced computer vision methods towards developing a markerless system. *Sports Medicine - Open*, *4*(1), 24. https://doi.org/10.1186/s40798-018-0139-y

Crawford, K. (2021). *Atlas of AI: Power, Politics, and the Planetary Costs of Artificial Intelligence*. Yale University Press.

Dourish, P. (2001). *Where the Action Is: The Foundations of Embodied Interaction*. MIT Press.

El Raheb, K., Kasougi, M., Stergiou, A., Doxastaki, S., & Ioannidis, Y. (2019). Dance in the digital environment: From movement generation to technology integration. *ACM Computing Surveys (CSUR)*, *52*(4), 1-38. https://doi.org/10.1145/3336125

Fdili Alaoui, S., Carlson, K., & Schiphorst, T. (2015). Choreography as a condition of survival: Dance and movement studies in HCI. *CHI '15 Extended Abstracts on Human Factors in Computing Systems*, 405-415. https://doi.org/10.1145/2702613.2732950

Fdili Alaoui, S., Françoise, J., Schiphorst, T., Carlson, K., & Bevilacqua, F. (2014). Choreographing interactives: Perspectives from dance and HCI. *Proceedings of the 2014 Conference on Designing Interactive Systems*, 267-276. https://doi.org/10.1145/2598510.2598574

Flyvbjerg, B. (2006). Five misunderstandings about case-study research. *Qualitative Inquiry*, *12*(2), 219–245. https://doi.org/10.1177/1077800405284363

Fortin, S., Long, W., & Lord, M. (2002). Three voices: Researching how somatic education informs contemporary dance technique classes. *Research in Dance Education*, *3*(2), 155-179. https://doi.org/10.1080/1464789022000034712

Gallagher, S. (2005). *How the Body Shapes the Mind*. Oxford University Press.

Green, J. (2003). Foucault and the training of docile bodies in dance education. *Arts and Learning Research Journal*, *19*(1), 99-125.

Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research*, *77*(1), 81-112.

Leach, J., & deLahunta, S. (2017). Dance becoming knowledge: Designing a digital body. *Leonardo*, *50*(5), 461-467. https://doi.org/10.1162/LEON_a_01067

Lugaresi, C., Tang, J., Nash, H., McClanahan, C., Uboweja, E., Hays, M., Zhang, F., Chang, C.-L., Yong, M. G., Lee, J., Chang, W.-T., Hua, W., Georg, M., & Grundmann, M. (2019). MediaPipe: A framework for building perception pipelines. *arXiv preprint arXiv:1906.08172*. https://doi.org/10.48550/arXiv.1906.08172

Merleau-Ponty, M. (2012). *Phenomenology of Perception* (D. A. Landes, Trans.). Routledge. (Original work published 1945)

Noddings, N. (2013). *Caring: A Relational Approach to Ethics and Moral Education* (2nd ed.). University of California Press. (Original work published 1984)

Noë, A. (2004). *Action in Perception*. MIT Press.

Picard, R. W. (1997). *Affective Computing*. MIT Press.

Salazar Sutil, N. (2015). *Motion and Representation: The Language of Human Movement*. MIT Press.

Schiphorst, T. (2011). *The varieties of user experience: Bridging embodied methodologies from somatics and performance to human computer interaction* (Doctoral dissertation, University of Plymouth).

Seethapathi, N., Wang, S., Saluja, R., Blohm, G., & Kording, K. P. (2019). Movement science needs different pose tracking computer vision. *PLOS Computational Biology*, *15*(7), e1007308. https://doi.org/10.1371/journal.pcbi.1007308

Sheets-Johnstone, M. (2011). *The Primacy of Movement* (2nd ed.). John Benjamins.

Stake, R. E. (1995). *The Art of Case Study Research*. Sage Publications.

Tronto, J. C. (1993). *Moral Boundaries: A Political Argument for an Ethic of Care*. Routledge.

Varela, F. J., Thompson, E., & Rosch, E. (1991). *The Embodied Mind: Cognitive Science and Human Experience*. MIT Press.

Wade, L., Needham, L., McGuigan, P., & Bilzon, J. (2022). Applications and limitations of current markerless motion capture methods for clinical biomechanics. *PeerJ*, *10*, e12995. https://doi.org/10.7717/peerj.12995

Whatley, S., & Blades, H. (2019). Digital Dance. In H. Thomas & J. Kolb (Eds.), *Bloomsbury Companion to Dance Studies* (pp. 37-52). Bloomsbury Academic.

Zuboff, S. (2019). *The Age of Surveillance Capitalism: The Fight for a Human Future at the New Frontier of Power*. PublicAffairs.
