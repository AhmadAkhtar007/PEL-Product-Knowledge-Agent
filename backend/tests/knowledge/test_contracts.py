from backend.app.modules.knowledge.contracts import Citation, Handoff, KnowledgeAnswer


def test_citation_preserves_unknown_optional_provenance_as_none():
    citation = Citation(
        source_id="pel-ref-001",
        chunk_id="pel-ref-001-chunk-01",
        document_title="PEL Refrigerator User Manual",
        product_category="refrigerator",
    )

    assert citation.section is None
    assert citation.model is None
    assert citation.series is None
    assert citation.page is None
    assert citation.source_url is None


def test_knowledge_answer_normalizes_grounded_to_false_without_citations():
    answer = KnowledgeAnswer(answer="I could not find a source.", grounded=True)

    assert answer.citations == []
    assert answer.grounded is False
    assert answer.handoff.recommended is False
    assert answer.handoff.label is None
    assert answer.handoff.url is None


def test_knowledge_answer_preserves_grounded_true_with_a_citation():
    citation = Citation(
        source_id="pel-ref-001",
        chunk_id="pel-ref-001-chunk-01",
        document_title="PEL Refrigerator User Manual",
        product_category="refrigerator",
    )

    answer = KnowledgeAnswer(
        answer="Set the temperature control according to the manual.",
        citations=[citation],
        grounded=True,
        handoff=Handoff(),
    )

    assert answer.grounded is True
    assert answer.citations == [citation]
