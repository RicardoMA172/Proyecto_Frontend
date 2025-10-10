import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Amon } from './amon';

describe('Amon', () => {
  let component: Amon;
  let fixture: ComponentFixture<Amon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Amon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Amon);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
