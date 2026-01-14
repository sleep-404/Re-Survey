"""
BoundaryAI - Intelligent Land Parcel Analysis

Core modules for the Re-Survey Challenge solution.
"""

__version__ = "0.1.0"
__author__ = "Re-Survey Team"

from .data_loader import ORILoader, RORLoader, ShapefileLoader, VillageDataset
from .segmentation import ParcelSegmenter, TiledSegmenter, RORGuidedSegmenter, BoundaryConfidenceEstimator
from .vectorization import TopologyEnforcer, BoundaryRefiner
from .ror_engine import RORConstraintEngine
from .confidence import ConfidenceScorer, ConflictDetector
from .pipeline import BoundaryAIPipeline, PipelineConfig, PipelineResult
from .edge_detection import EdgeDetector, BundDetector
from .topology import TopologyFixer
from .evaluation import ParcelEvaluator, EvaluationResult

__all__ = [
    'ORILoader',
    'RORLoader',
    'ShapefileLoader',
    'VillageDataset',
    'ParcelSegmenter',
    'TiledSegmenter',
    'RORGuidedSegmenter',
    'BoundaryConfidenceEstimator',
    'TopologyEnforcer',
    'BoundaryRefiner',
    'RORConstraintEngine',
    'ConfidenceScorer',
    'ConflictDetector',
    'BoundaryAIPipeline',
    'PipelineConfig',
    'PipelineResult',
    'EdgeDetector',
    'BundDetector',
    'TopologyFixer',
    'ParcelEvaluator',
    'EvaluationResult',
]
