"""
BoundaryAI - Intelligent Land Parcel Analysis

Core modules for the Re-Survey Challenge solution.
"""

__version__ = "0.1.0"
__author__ = "Re-Survey Team"

from .data_loader import ORILoader, RORLoader, ShapefileLoader, VillageDataset
from .segmentation import ParcelSegmenter, TiledSegmenter
from .vectorization import TopologyEnforcer, BoundaryRefiner
from .ror_engine import RORConstraintEngine
from .confidence import ConfidenceScorer, ConflictDetector, BatchAnalyzer
from .pipeline import BoundaryAIPipeline, PipelineConfig, PipelineResult

__all__ = [
    'ORILoader',
    'RORLoader',
    'ShapefileLoader',
    'VillageDataset',
    'ParcelSegmenter',
    'TiledSegmenter',
    'TopologyEnforcer',
    'BoundaryRefiner',
    'RORConstraintEngine',
    'ConfidenceScorer',
    'ConflictDetector',
    'BatchAnalyzer',
    'BoundaryAIPipeline',
    'PipelineConfig',
    'PipelineResult',
]
