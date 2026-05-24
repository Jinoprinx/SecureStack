from dataclasses import dataclass
import importlib
import pkgutil
import logging

logger = logging.getLogger(__name__)

@dataclass
class RemediationResult:
    success: bool
    resource_id: str
    action_taken: str
    before_state: dict
    after_state: dict
    error_message: str | None = None

# Automatically find all remediation modules in this directory
def get_remediations():
    remediations = []
    package = importlib.import_module(__name__)
    for _, module_name, _ in pkgutil.iter_modules(package.__path__):
        module = importlib.import_module(f"{__name__}.{module_name}")
        if hasattr(module, "can_remediate") and hasattr(module, "remediate"):
            remediations.append(module)
    return remediations
