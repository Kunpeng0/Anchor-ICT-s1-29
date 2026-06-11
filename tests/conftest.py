import os
import pytest

# Reuse the existing test helper to create a seeded temporary DB.
# Importing `tests.test_db` only exposes functions (no top-level test execution).
@pytest.fixture
def db(request):
    """
    Provide a seeded temporary DB. Choose the seeding helper based on the
    requesting test module so `test_api.py` and `test_db.py` get the data they
    expect.
    """
    module_name = getattr(request, "module").__name__
    if module_name.endswith("test_api"):
        from tests.test_api import make_test_db as _make
    else:
        from tests.test_db import make_test_db as _make

    db_path = _make()
    try:
        yield db_path
    finally:
        try:
            os.remove(db_path)
        except Exception:
            pass
