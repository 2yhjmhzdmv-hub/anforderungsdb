from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .database import Base


class Category(Base):
    __tablename__ = "category"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    requirements = relationship("Requirement", back_populates="category")


class Scope(Base):
    __tablename__ = "scope"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    parent_scope_id = Column(Integer, ForeignKey("scope.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    parent = relationship("Scope", remote_side="Scope.id", foreign_keys=[parent_scope_id])
    children = relationship("Scope", foreign_keys=[parent_scope_id], back_populates="parent")
    answers = relationship("Answer", back_populates="scope")


class IsoControl(Base):
    __tablename__ = "iso_control"
    id = Column(Integer, primary_key=True)
    control_id = Column(String(20), nullable=False, unique=True)
    title = Column(String(500), nullable=False)
    domain = Column(String(100))


class RequirementIsoControl(Base):
    __tablename__ = "requirement_iso_control"
    requirement_id = Column(Integer, ForeignKey("requirement.id", ondelete="CASCADE"), primary_key=True)
    iso_control_id = Column(Integer, ForeignKey("iso_control.id", ondelete="CASCADE"), primary_key=True)


class Requirement(Base):
    __tablename__ = "requirement"
    id = Column(Integer, primary_key=True)
    text = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=True)
    embedding = Column(Vector(1024))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="requirements")
    answers = relationship("Answer", back_populates="requirement", cascade="all, delete-orphan")
    iso_controls = relationship("IsoControl", secondary="requirement_iso_control")
    customer_mappings = relationship("CustomerRequirementMapping", back_populates="requirement")


class Answer(Base):
    __tablename__ = "answer"
    id = Column(Integer, primary_key=True)
    requirement_id = Column(Integer, ForeignKey("requirement.id", ondelete="CASCADE"), nullable=False)
    scope_id = Column(Integer, ForeignKey("scope.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    requirement = relationship("Requirement", back_populates="answers")
    scope = relationship("Scope", back_populates="answers")

    __table_args__ = (UniqueConstraint("requirement_id", "scope_id"),)


class CustomerRequirement(Base):
    __tablename__ = "customer_requirement"
    id = Column(Integer, primary_key=True)
    text = Column(Text, nullable=False)
    scope_id = Column(Integer, ForeignKey("scope.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    scope = relationship("Scope")
    mappings = relationship("CustomerRequirementMapping", back_populates="customer_requirement", cascade="all, delete-orphan")


class CustomerRequirementMapping(Base):
    __tablename__ = "customer_requirement_mapping"
    customer_requirement_id = Column(Integer, ForeignKey("customer_requirement.id", ondelete="CASCADE"), primary_key=True)
    requirement_id = Column(Integer, ForeignKey("requirement.id", ondelete="CASCADE"), primary_key=True)
    score = Column(Float)
    is_manual = Column(Boolean, nullable=False, default=False)

    customer_requirement = relationship("CustomerRequirement", back_populates="mappings")
    requirement = relationship("Requirement", back_populates="customer_mappings")
