from pydantic import BaseModel, Field, model_validator


class Citation(BaseModel):
    source_id: str
    chunk_id: str
    document_title: str
    product_category: str
    section: str | None = None
    model: str | None = None
    series: str | None = None
    page: int | None = None
    source_url: str | None = None


class Handoff(BaseModel):
    recommended: bool = False
    label: str | None = None
    url: str | None = None


class KnowledgeAnswer(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    grounded: bool = False
    handoff: Handoff = Field(default_factory=Handoff)

    @model_validator(mode="after")
    def require_citations_for_grounded_answer(self) -> "KnowledgeAnswer":
        if self.grounded and not self.citations:
            self.grounded = False
        return self
