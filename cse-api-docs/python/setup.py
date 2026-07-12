from setuptools import setup

setup(
    name="cse-lk-unofficial",
    version="0.1.0",
    description="Minimal unofficial cse.lk HTTP helpers (educational)",
    packages=["cse_lk"],
    package_dir={"cse_lk": "cse_lk"},
    install_requires=["httpx>=0.27"],
    python_requires=">=3.11",
    license="MIT",
)
